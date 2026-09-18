"""Tests for the RAG hybrid router: classifier, context manager, and endpoint."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from api.models import Patient, ConversationSession, QueueEntry
from api.rag.query_classifier import classify_query, INTENT_PATIENT_HISTORY, INTENT_QUEUE
from api.rag.context_manager import get_or_create_session, append_query, cleanup_expired_sessions
from api.rag.hybrid_router import hybrid_search, _live_queue_data
from datetime import date
from unittest.mock import patch
from django.test.utils import override_settings
import tempfile

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


class QueryClassifierTests(TestCase):
    def test_extracts_patient_id(self):
        c = classify_query("show history for patient 5")
        self.assertEqual(c.matched_patient, 5)
        self.assertEqual(c.intent, INTENT_PATIENT_HISTORY)

    def test_medication_intent(self):
        c = classify_query("what dose of drug x")
        self.assertEqual(c.intent, "medication")

    def test_queue_intent(self):
        c = classify_query("how many patients are waiting")
        self.assertEqual(c.intent, INTENT_QUEUE)
        c2 = classify_query("list all patients waiting to call doctor")
        self.assertEqual(c2.intent, INTENT_QUEUE)


class ContextManagerTests(TestCase):
    def test_session_persists_and_counts(self):
        doctor = make_doctor()
        s = get_or_create_session("sess-1", doctor)
        append_query(s, "hi", "patient_history")
        self.assertEqual(s.query_count, 1)
        reloaded = ConversationSession.objects.get(session_id="sess-1")
        self.assertEqual(reloaded.query_count, 1)

    def test_cleanup_expires(self):
        doctor = make_doctor()
        s = get_or_create_session("sess-2", doctor)
        from django.utils import timezone
        ConversationSession.objects.filter(pk=s.pk).update(expires_at=timezone.now() - timezone.timedelta(days=1))
        self.assertEqual(cleanup_expired_sessions(), 1)
        refresh = ConversationSession.objects.get(pk=s.pk)
        self.assertEqual(refresh.status, "expired")


class HybridEndpointTests(TestCase):
    def test_hybrid_query_returns_contract(self):
        doctor = make_doctor()
        client = APIClient()
        client.force_authenticate(doctor)
        resp = client.post("/api/rag/hybrid_query/", {"query": "history patient 1"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("classification", resp.data)
        self.assertIn("session_id", resp.data)

    def test_empty_query_rejected(self):
        doctor = make_doctor()
        client = APIClient()
        client.force_authenticate(doctor)
        resp = client.post("/api/rag/hybrid_query/", {"query": ""}, format="json")
        self.assertEqual(resp.status_code, 400)


class LiveQueueDataTests(TestCase):
    def test_live_queue_uses_orm_not_vector(self):
        """Verify that _live_queue_data returns real QueueEntry records."""
        doctor = make_doctor()
        patient = Patient.objects.create(first_name="Test", last_name="Patient", hkid="T123456(7)", date_of_birth=date(2000, 1, 1))
        QueueEntry.objects.create(patient=patient, status="waiting")

        data = _live_queue_data()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["patient_id"], patient.id)
        self.assertEqual(data[0]["source_type"], "queue:live")

    def test_hybrid_search_queue_intent_uses_live_data(self):
        """Queue intent queries should use live ORM data, not vector search."""
        doctor = make_doctor()
        patient = Patient.objects.create(first_name="Queue", last_name="Test", hkid="Q123456(7)", date_of_birth=date(2000, 1, 1))
        QueueEntry.objects.create(patient=patient, status="waiting")

        result = hybrid_search("how many patients are waiting")
        self.assertEqual(result["classification"]["intent"], INTENT_QUEUE)
        has_queue_result = any(r.get("source_type") == "queue:live" for r in result["vector_results"])
        self.assertTrue(has_queue_result, "queue:live results should be present for queue intent")


class WaitingQueueEndpointTests(TestCase):
    def test_waiting_queue_endpoint(self):
        """GET /api/queue/waiting/ returns ORM data matching tab page."""
        doctor = make_doctor()
        patient = Patient.objects.create(first_name="Wait", last_name="Test", hkid="W123456(7)", date_of_birth=date(2000, 1, 1))
        QueueEntry.objects.create(patient=patient, status="waiting")

        client = APIClient()
        client.force_authenticate(doctor)
        resp = client.get("/api/queue/waiting/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("total_waiting", resp.data)
        self.assertIn("patients", resp.data)
        self.assertEqual(resp.data["total_waiting"], 1)


class AutoIndexSignalTests(TestCase):
    """post_save/post_delete signals upsert/remove LanceDB rows."""

    @override_settings(LANCEDB_URI=tempfile.mkdtemp())
    @patch("api.rag.indexer.embed_text", return_value=[0.1] * 384)
    def test_save_upserts_delete_removes(self, _mock):
        from api.rag.indexer import _table, _SOURCES
        self.assertIn("api_patient", _SOURCES)

        p = Patient.objects.create(first_name="Signal", last_name="Test", hkid="S123456(7)", date_of_birth=date(2000, 1, 1))
        rows = _table().search().limit(10).to_list()
        self.assertEqual(len(rows), 1)

        p.first_name = "Signal2"
        p.save()
        rows = _table().search().limit(10).to_list()
        self.assertEqual(len(rows), 1, "update must upsert, not duplicate")

        p.delete()
        rows = _table().search().limit(10).to_list()
        self.assertEqual(len(rows), 0, "delete must remove the row")