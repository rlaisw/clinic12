"""
ContextRetentionManager: stateful conversation memory for the RAG hybrid router.

Persists conversation context across turns in the ConversationSession model and
exposes helpers to read/update a session's accumulated context.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from django.utils import timezone
from django.db import transaction

from api.models import ConversationSession

logger = logging.getLogger(__name__)

SESSION_TTL_DAYS = 7
MAX_QUERIES = 10


def get_or_create_session(session_id: str, doctor, patient=None) -> ConversationSession:
    """Fetch an active session owned by *doctor* or create a new one, sliding expiration."""
    session_id = session_id or str(uuid.uuid4())
    now = timezone.now()

    # Sessions are scoped to their owning doctor -- a session id alone does not
    # grant cross-doctor access.
    session = (
        ConversationSession.objects.filter(
            session_id=session_id, doctor=doctor, status="active"
        )
        .select_related("doctor", "patient")
        .first()
    )
    if session is not None:
        if session.is_expired():
            session.status = "expired"
            session.save(update_fields=["status"])
            session = None
    if session is None:
        session = ConversationSession.objects.create(
            session_id=session_id,
            doctor=doctor,
            patient=patient,
            expires_at=now + timezone.timedelta(days=SESSION_TTL_DAYS),
        )
    else:
        # Touch expiry (sliding window) without growing it indefinitely.
        session.expires_at = now + timezone.timedelta(days=SESSION_TTL_DAYS)
        if patient is not None and not session.patient_id:
            session.patient = patient
        session.save(update_fields=["expires_at", "patient"])
    return session


def append_query(session: ConversationSession, query: str, summary: str) -> None:
    """Record a query turn into the session's context store."""
    with transaction.atomic():
        past = session.context_data.get("history", [])
        past = past[-(MAX_QUERIES - 1):]  # keep bounded
        past.append({"query": query, "summary": summary, "t": time.time()})
        session.context_data["history"] = past
        session.query_count = session.query_count + 1
        session.save(update_fields=["context_data", "query_count", "updated_at"])


def build_context_prompt(session_id: str) -> str:
    """Return a small text block of the session's recent history for LLM prompt."""
    session = (
        ConversationSession.objects.filter(session_id=session_id, status="active").first()
    )
    if session is None:
        return ""
    history = session.context_data.get("history", [])
    lines = []
    for turn in history[-5:]:
        lines.append(f"Q: {turn.get('query', '')}")
        if turn.get("summary"):
            lines.append(f"A: {turn['summary']}")
    return "\n".join(lines)


def cleanup_expired_sessions() -> int:
    """Expire and remove sessions past their TTL. Returns number cleaned."""
    now = timezone.now()
    expired = ConversationSession.objects.filter(expires_at__lte=now, status="active")
    count = expired.count()
    if count:
        expired.update(status="expired")
    return count