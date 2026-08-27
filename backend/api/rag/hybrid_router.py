"""
HybridRouter: executes BOTH a structured SQL lookup and a vector search for a
query, then merges the results with weighted scoring.

Q1 answer (see spec clarification): "always run both SQL and vector, merge results."
"""

from __future__ import annotations

import logging

from api.models import Patient, MedicalHistory, ActiveMedication, QueueEntry

from .dify_adapter import search_context
from .query_classifier import classify_query, INTENT_QUEUE

logger = logging.getLogger(__name__)

# Weight SQL higher for exact patient lookups, vector higher for semantic recall.
SQL_WEIGHT = 0.6
VECTOR_WEIGHT = 0.4


def _sql_lookup(patient_id: int | None, intent: str) -> list[dict]:
    """Query Django ORM for structured patient context."""
    results: list[dict] = []
    if patient_id is None:
        return results

    try:
        p = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return results

    results.append({
        "patient_id": p.id,
        "source_type": "sql:patient",
        "text_content": f"{p.get_full_name()} (blood type {p.blood_type or 'unknown'})",
        "score": 1.0,
    })

    meds = ActiveMedication.objects.filter(patient=p)[:5]
    for m in meds:
        results.append({
            "patient_id": p.id,
            "source_type": "sql:medication",
            "text_content": f"{m.name} {m.dosage} {m.route} {m.frequency}",
            "score": 0.9,
        })

    history = MedicalHistory.objects.filter(patient=p)[:5]
    for h in history:
        results.append({
            "patient_id": p.id,
            "source_type": "sql:medical_history",
            "text_content": f"{h.condition} diagnosed {h.diagnosis_date}",
            "score": 0.9,
        })

    return results


def _live_queue_data() -> list[dict]:
    """Return real-time queue data from Django ORM — same source as the tab page."""
    waiting = QueueEntry.objects.filter(status='waiting').select_related('patient').order_by('check_in_time')
    return [
        {
            "patient_id": q.patient.id,
            "patient_name": f"{q.patient.first_name} {q.patient.last_name}",
            "source_type": "queue:live",
            "text_content": f"{q.patient.first_name} {q.patient.last_name} (ID {q.patient.id}) — waiting since {q.check_in_time.strftime('%H:%M')}",
            "score": 1.0,
            "visit_type": q.visit_type,
            "check_in_time": q.check_in_time.isoformat(),
        }
        for q in waiting
    ]


def hybrid_search(query: str, patient_id: int | None = None, top_k: int = 5) -> dict:
    """Run structured SQL + vector search against *query*, merge with weights.
    For queue_status queries, uses real Django ORM data instead of vector search."""
    classification = classify_query(query)
    pid = patient_id if patient_id is not None else classification.matched_patient

    # SQL branch (structured).
    sql_results = _sql_lookup(pid, classification.intent)

    # Vector branch (semantic) — skip for queue queries, use live ORM data instead.
    if classification.intent == INTENT_QUEUE:
        vector_results = _live_queue_data()
    else:
        vector_results = search_context(query, top_k=top_k)

    # Merge: normalized score = SQL_WEIGHT*sql_score for SQL hits, else vector.
    merged: list[dict] = []
    seen = set()
    for r in sql_results:
        key = (r["source_type"], r["text_content"])
        if key in seen:
            continue
        seen.add(key)
        r["merged_score"] = round(SQL_WEIGHT * r["score"], 4)
        if r.get("patient_id") is not None:
            merged.append(r)

    for v in vector_results:
        key = (v.get("source_type"), v.get("text_content"))
        if key in seen:
            continue
        seen.add(key)
        vec = {
            "patient_id": v.get("patient_id"),
            "source_type": v.get("source_type"),
            "text_content": v.get("text_content"),
            "score": v.get("score", 0),
            "normalized": round(VECTOR_WEIGHT * float(v.get("score", 0)), 4),
        }
        merged.append(vec)

    merged.sort(key=lambda r: r.get("normalized", 0), reverse=True)
    return {
        "classification": classification.to_dict(),
        "query_type": "hybrid",
        "sql_results": sql_results,
        "vector_results": vector_results,
        "results": merged[:top_k],
    }