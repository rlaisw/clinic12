"""
Query classification for the RAG hybrid router.
Classifies a user query into an intent category to select the best retrieval path.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

INTENT_PATIENT_HISTORY = "patient_history"
INTENT_MEDICATION = "medication"
INTENT_APPOINTMENT = "appointment"
INTENT_QUEUE = "queue_status"
INTENT_GENERAL = "general"
INTENT_UNKNOWN = "unknown"

# Lightweight regex/BM25-ish heuristics. Keeping it rule-based because the
# existing RAG system has no labeled training corpus -- a trained classifier
# is the documented upgrade path.
_PATIENT_RE = re.compile(
    r"\b(patient|pid|id|hkid)\b|history of|medical history|past\\s+medical",
    re.IGNORECASE,
)
_MEDICATION_RE = re.compile(
    r"\b(medication|drug|dose|dosag|prescription|medicine|route|frequency)\b",
    re.IGNORECASE,
)
_APPOINTMENT_RE = re.compile(
    r"\bappointment|follow[- ]up|visit|booking|consultation\b",
    re.IGNORECASE,
)
_QUEUE_RE = re.compile(
    r"\bqueue|waiting|status|check[- ]in|in[- ]consultation\b",
    re.IGNORECASE,
)


@dataclass
class Classification:
    """Result of classifying a single query text."""

    intent: str
    confidence: float  # 0.0 - 1.0
    matched_patient: int | None = None
    keywords: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "intent": self.intent,
            "confidence": round(self.confidence, 4),
            "matched_patient": self.matched_patient,
            "keywords": self.keywords,
        }


def _extract_patient_id(query: str) -> int | None:
    """Pull a numeric patient id if the query references one."""
    for m in re.finditer(r"\b(?:patient|pid|id)[\s#:]*(\d{1,6})\b", query, re.IGNORECASE):
        return int(m.group(1))
    return None


def classify_query(query: str) -> Classification:
    """Classify *query* into an intent with a heuristic confidence score."""
    q = (query or "").strip()
    if not q:
        return Classification(INTENT_UNKNOWN, 0.0)

    matched_intents: list[tuple[str, float, list[str]]] = []
    patterns = [
        (INTENT_PATIENT_HISTORY, _PATIENT_RE, ["patient"]),
        (INTENT_MEDICATION, _MEDICATION_RE, ["medication"]),
        (INTENT_APPOINTMENT, _APPOINTMENT_RE, ["appointment"]),
        (INTENT_QUEUE, _QUEUE_RE, ["queue"]),
    ]
    for intent, rx, keywords in patterns:
        m = rx.search(q)
        # Using stringified width; the regexes match on words not tokens.
        matched = bool(m)
        if matched:
            conf = 0.7 + min(0.2, (len(q) / 200.0))  # longer query -> slightly more confident
            conf = min(conf, 1.0)
            # Keep only the interoperable pattern count for the confidence ceiling.
            matched_intents.append((intent, conf, keywords))

    # Patient-id presence dominates intent.
    pid = _extract_patient_id(q)
    matched_intents.sort(key=lambda t: t[1], reverse=True)
    if not matched_intents:
        intent, conf, kw = INTENT_GENERAL, 0.5, []
    else:
        if pid is not None:
            intent, conf, kw = INTENT_PATIENT_HISTORY, max(0.9, matched_intents[0][1]), ["patient"]
        else:
            intent, conf, kw = matched_intents[0]
    return Classification(intent, conf, matched_patient=pid, keywords=kw)