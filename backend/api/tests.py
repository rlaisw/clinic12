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