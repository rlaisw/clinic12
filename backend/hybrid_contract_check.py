"""
Contract sanity check for the hybrid_query + session endpoints.

Run: python tests/hybrid_contract_check.py
Requires: a running/configured Django env and a doctor user token.
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient  # noqa: E402
from django.contrib.auth.models import User  # noqa: E402
from accounts.models import Profile  # noqa: E402
from api.models import ConversationSession  # noqa: E402

BASE = "/api/rag"


def _doctor_user() -> User:
    p = Profile.objects.filter(role="doctor").first()
    return p.user if p else None


def _non_doctor(user) -> User:
    return User.objects.exclude(pk=user.pk).first()


def main() -> int:
    doctor = _doctor_user()
    if doctor is None:
        print("FAIL: no doctor user available")
        return 1

    client = APIClient()
    client.force_authenticate(doctor)

    resp = client.post(f"{BASE}/hybrid_query/", {"query": ""}, format="json")
    if resp.status_code != 400:
        print("FAIL: empty query should be 400, got", resp.status_code)
        return 1

    resp = client.post(
        f"{BASE}/hybrid_query/",
        {"query": "show medical history for patient 1", "session_id": "contract-1"},
        format="json",
    )
    if resp.status_code != 200:
        print("FAIL: hybrid_query expected 200, got", resp.status_code, resp.data)
        return 1
    data = resp.data
    assert "classification" in data, "missing classification"
    assert "results" in data, "missing results"
    assert "session_id" in data, "missing session_id"

    sid = data["session_id"]
    stored = ConversationSession.objects.filter(session_id=sid).first()
    assert stored is not None and stored.query_count >= 1, "session not persisted"
    assert stored.doctor_id == doctor.id, "session not scoped to doctor"

    other = _non_doctor(doctor)
    if other:
        c2 = APIClient()
        c2.force_authenticate(other)
        r2 = c2.post(
            f"{BASE}/hybrid_query/",
            {"query": "hello", "session_id": sid},
            format="json",
        )
        # Isolation: either denied outright, or given a brand-new session id.
        isolated = r2.status_code == 403 or (
            r2.status_code == 200 and r2.data.get("session_id") != sid
        )
        assert isolated, "cross-doctor session was exposed or reused"

    print("PASS: hybrid router contract checks OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())