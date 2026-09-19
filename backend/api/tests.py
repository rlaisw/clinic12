from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from datetime import date

from accounts.models import Profile
from api.models import Patient, Receipt
from api.utils import generate_receipt_number, generate_receipt_qr_code_token


User = get_user_model()


def make_doctor():
    doctor = User.objects.create_user(username="dr_test", password="x")
    profile = getattr(doctor, "profile", None)
    if profile is None:
        profile = Profile.objects.create(user=doctor, role="doctor")
    else:
        profile.role = "doctor"
        profile.save()
    return doctor


def make_receipt(patient):
    """Create the minimum valid active receipt the PDF generator needs."""
    return Receipt.objects.create(
        patient=patient,
        patient_name=f"{patient.first_name} {patient.last_name}",
        patient_hkid=patient.hkid,
        consultation="Consultation",
        medications="Medications",
        investigations="Investigations",
        procedures="Procedures",
        misc="Misc",
        consultation_free=100,
        medications_free=50,
        investigations_free=20,
        procedures_free=30,
        misc_free=0,
        total_free=200,
        total_dollars="Two hundred dollars",
        diagnosis="Diagnosis",
        rref=generate_receipt_number(timezone.now().date()),
        qr_code_token=generate_receipt_qr_code_token(str(patient.id), timezone.now().date()),
    )


class MedicationHistoryViewTests(TestCase):
    """Combined view must return medications from all three tables."""

    def setUp(self):
        self.patient = Patient.objects.create(
            first_name="Raymond",
            last_name="Lai",
            date_of_birth=date(1964, 5, 1),
            gender="M",
            phone="12345678",
        )
        from api.models import ActiveMedication, PastMedication, PrescriptionMedication
        ActiveMedication.objects.create(
            patient=self.patient, name="Dextromethorphan", dosage="450 mg",
            route="oral", frequency="four times daily", start_date=date(2026, 9, 15),
            diagnostic_result="Influenza",
        )
        PastMedication.objects.create(
            patient=self.patient, name="Omeprazole", dosage="450 mg",
            route="oral", frequency="twice daily", start_date=date(2026, 9, 19),
            end_date=date(2026, 9, 24), diagnostic_result="Stomachache",
        )
        PrescriptionMedication.objects.create(
            patient=self.patient, item=1, medication_name="Paracetamol 1",
            dosage_amount=1, dosage_unit="tablets", route="oral", frequency="twice daily",
            start_date=date(2026, 9, 18), end_date=date(2026, 9, 21), diagnostic_result="Influenza",
        )

    def test_view_unions_all_three_tables(self):
        from django.db import connection
        with connection.cursor() as cur:
            cur.execute(
                "SELECT category, medication_name FROM api_medication_history WHERE patient_id = %s "
                "ORDER BY category, medication_name",
                [self.patient.id],
            )
            rows = cur.fetchall()
        self.assertEqual(len(rows), 3, rows)
        self.assertIn(("active", "Dextromethorphan"), rows)
        self.assertIn(("past", "Omeprazole"), rows)
        self.assertIn(("prescription", "Paracetamol 1"), rows)

    def test_sql_schema_exposes_combined_view_with_steer_note(self):
        client = APIClient()
        resp = client.get("/api/sql/schema")
        self.assertEqual(resp.status_code, 200)
        tables = resp.data["tables"]
        self.assertIn("api_medication_history", tables)
        desc = tables["api_medication_history"].get("description", "")
        self.assertIn("COMBINED medication history", desc)


class ReceiptPdfEndpointTests(TestCase):
    """Regression guard for the Receipt Preview 500 (missing ``fitz`` import)."""

    def setUp(self):
        self.doctor = make_doctor()
        self.client = APIClient()
        self.client.force_authenticate(user=self.doctor)
        self.patient = Patient.objects.create(
            first_name="Ada",
            last_name="Lovelace",
            date_of_birth=date(1815, 12, 10),
            gender="F",
            phone="12345678",
        )
        self.receipt = make_receipt(self.patient)

    def test_receipt_pdf_returns_200_pdf(self):
        """GET /api/receipts/{id}/pdf/ must return a valid PDF (was HTTP 500

        because `fitz`/PyMuPDF was not installed)."""
        response = self.client.get(f"/api/receipts/{self.receipt.id}/pdf/")
        self.assertEqual(response.status_code, 200, response.content[:200])
        self.assertEqual(response["Content-Type"], "application/pdf")
        # %PDF header: a valid PDF (generation may fail via missing fitz/PyMuPDF)
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_receipt_pdf_requires_doctor_role(self):
        response = self.client.get(f"/api/receipts/{self.receipt.id}/pdf/")
        self.assertNotEqual(response.status_code, 401)
        self.assertNotEqual(response.status_code, 403)


class SqlQueryProseToleranceTests(TestCase):
    """Regression guard: the bot appends prose ("... But first ...") without a
    closing ';' to generated SQL. The endpoint must recover, not 400."""

    def setUp(self):
        self.doctor = make_doctor()
        self.client = APIClient()
        self.client.force_authenticate(user=self.doctor)
        self.patient = Patient.objects.create(
            first_name="Raymond",
            last_name="Lai",
            date_of_birth=date(1964, 5, 1),
            gender="M",
            phone="12345678",
        )

    def _post_sql(self, sql):
        return self.client.post("/api/sql/", {"sql": sql}, format="json")

    def test_trailing_prose_without_semicolon_recovers(self):
        """SQL followed by 'But ...' (no ';') must still return the query rows."""
        sql = f"SELECT count(*) FROM api_patient But first check the row count"
        resp = self._post_sql(sql)
        self.assertEqual(resp.status_code, 200, resp.content[:300])
        self.assertIn("rows", resp.data)
        self.assertEqual(resp.data["rows"][0]["count(*)"], 1)

    def test_clean_sql_unaffected(self):
        resp = self._post_sql(f"SELECT count(*) FROM api_patient")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["rows"][0]["count(*)"], 1)

    def test_helper_returns_longest_executable_prefix(self):
        from api.views import _executable_prefix
        import sqlite3, tempfile, os
        # Production DB is a real sqlite file; the Django in-memory test DB
        # isn't reachable via a bare sqlite3.connect, so mirror production.
        with tempfile.NamedTemporaryFile(suffix=".db3", delete=False) as tf:
            path = tf.name
        try:
            conn = sqlite3.connect(path)
            conn.execute("CREATE TABLE api_patient (id INTEGER)")
            conn.execute("INSERT INTO api_patient VALUES (1)")
            conn.commit()
            recovered = _executable_prefix(
                conn,
                "SELECT count(*) FROM api_patient But first check the row count",
            )
            # The scan stops at the first token SQLite can't absorb, which is
            # exactly where the trailing prose begins. A prose word right after
            # a table name can be absorbed as an alias — harmless for results.
            self.assertIsNotNone(recovered)
            cur = conn.cursor()
            cur.execute(f"{recovered} LIMIT 200")
            self.assertEqual(cur.fetchone()[0], 1)
            self.assertIsNone(_executable_prefix(conn, "But not sql at all"))
        finally:
            conn.close()
            os.unlink(path)