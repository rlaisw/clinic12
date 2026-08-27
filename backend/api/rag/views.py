"""
RAG query endpoint for the Clinic RAG System (DRF ViewSet).
Returns relevant medical context from LanceDB given a natural-language query.
"""

import logging

from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import ReviewSession
from ..views import DoctorPermission
from .embedding import embed_text
from .dify_adapter import search_context, forward_to_dify
from .alerts import alert_manager, Alert
from .concurrency import rag_rate_limiter
from .query_classifier import classify_query, INTENT_QUEUE
from .hybrid_router import _live_queue_data

logger = logging.getLogger(__name__)

# ponytail: in-memory LanceDB client — replace with persistent connection for prod
_LANCE_TABLE = None


def _get_table():
    global _LANCE_TABLE
    if _LANCE_TABLE is not None:
        return _LANCE_TABLE
    import lancedb
    from django.conf import settings
    uri = getattr(settings, "LANCEDB_URI", "lancedb")
    db = lancedb.connect(uri)
    try:
        _LANCE_TABLE = db.open_table("clinical_embeddings")
    except Exception:
        _LANCE_TABLE = None
    return _LANCE_TABLE


class RagQueryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DoctorPermission]

    def list(self, request):
        """List review sessions for the current doctor."""
        sessions = ReviewSession.objects.filter(reviewer=request.user).order_by("-created_at")
        data = [
            {
                "id": str(s.id),
                "query": s.query,
                "answer": s.answer,
                "status": s.status,
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ]
        return Response(data)

    @action(detail=False, methods=["post"])
    def query(self, request):
        query_text = request.data.get("query", "").strip()
        if not query_text:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)

        top_k = int(request.data.get("top_k", 5))

        table = _get_table()
        if table is None:
            return Response({"error": "vector store unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Hybrid search: exact patient_id match when query references an ID
        import re
        id_matches = re.findall(r"\b(?:patient|id|pid)[\s#]*(\d{1,6})\b", query_text, re.IGNORECASE)
        results = []
        matched_ids = set()

        for pid in id_matches:
            pid_int = int(pid)
            try:
                exact = table.search().where(f"patient_id = {pid_int}", prefilter=True).limit(top_k).to_list()
            except Exception:
                exact = []
            if exact:
                matched_ids.add(pid_int)
                results.extend(exact)

        # Fall back to vector search if no exact ID match (or no ID in query)
        if not results:
            vec = embed_text(query_text)
            if vec is None:
                return Response({"error": "embedding model unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            results = table.search(vec).limit(top_k).to_list()

        # De-duplicate by record id
        seen = set()
        deduped = []
        for r in results:
            rid = r.get("id")
            if rid in seen:
                continue
            seen.add(rid)
            deduped.append(r)

        return Response({
            "query": query_text,
            "patient_ids_matched": sorted(matched_ids),
            "results": [
                {
                    "patient_id": r["patient_id"],
                    "source_type": r.get("source_type"),
                    "text_content": r.get("text_content"),
                    "score": round(r.get("_distance", 0), 4),
                }
                for r in deduped
            ],
        })

    @action(detail=False, methods=["post"])
    def chat(self, request):
        """
        Full chat flow: embeds query → searches LanceDB → forwards context to
        Dify → returns the Dify answer.
        """
        rag_rate_limiter.acquire()

        query_text = request.data.get("query", "").strip()
        if not query_text:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)

        session_id = request.data.get("session_id", "")
        top_k = int(request.data.get("top_k", 5))

        # 1. retrieve context — use live ORM data for queue queries, vector search otherwise
        classification = classify_query(query_text)
        if classification.intent == INTENT_QUEUE:
            queue_data = _live_queue_data()
            context = queue_data
            # Inject live queue data directly into the query so Dify cannot ignore it
            queue_summary = ", ".join(
                f"{d['patient_name']} (ID {d['patient_id']})" for d in queue_data
            )
            query_text = f"[LIVE QUEUE DATA — {len(queue_data)} patient(s) waiting: {queue_summary}] {query_text}"
        else:
            context = search_context(query_text, top_k=top_k)

        # 2. forward to Dify
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            answer = loop.run_until_complete(
                forward_to_dify(session_id, query_text, context)
            )
        finally:
            loop.close()

        if answer is None:
            return Response(
                {"error": "Dify upstream unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Auto-log a review session for audit
        ReviewSession.objects.create(
            reviewer=request.user,
            query=query_text,
            answer=answer,
            context_used=context,
        )

        return Response({
            "query": query_text,
            "context_count": len(context),
            "answer": answer,
        })

    @action(detail=False, methods=["post"])
    def hybrid_query(self, request):
        """
        Hybrid router query: classifies the query, executes BOTH a structured
        SQL lookup and a vector search, merges results, and persists the turn
        into a stateful conversation session.
        """
        rag_rate_limiter.acquire()

        query_text = request.data.get("query", "").strip()
        if not query_text:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)

        session_id = request.data.get("session_id", "")
        top_k = int(request.data.get("top_k", 5))
        patient_id = request.data.get("patient_id") or None

        from .hybrid_router import hybrid_search
        from .context_manager import (
            get_or_create_session,
            append_query,
            build_context_prompt,
        )

        # 1. create/load stateful session context
        session = get_or_create_session(session_id, request.user)

        try:
            patient_id = int(patient_id) if patient_id else None
        except (TypeError, ValueError):
            patient_id = None

        # 2. hybrid search (SQL + vector)
        search = hybrid_search(query_text, patient_id=patient_id, top_k=top_k)

        # 3. persist the turn into session memory
        summary = search["classification"]["intent"]
        append_query(session, query_text, summary)
        context = build_context_prompt(session.session_id)

        return Response({
            "query": query_text,
            "session_id": session.session_id,
            "classification": search["classification"],
            "query_type": "hybrid",
            "sql_results": search["sql_results"],
            "vector_results": search["vector_results"],
            "results": search["results"],
            "context": context,
            "query_count": session.query_count,
        })

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """Approve or reject a review session."""
        try:
            session = ReviewSession.objects.get(id=pk, reviewer=request.user)
        except ReviewSession.DoesNotExist:
            return Response({"error": "review session not found"}, status=status.HTTP_404_NOT_FOUND)

        action_type = request.data.get("action", "").strip()
        if action_type not in ("approved", "rejected"):
            return Response({"error": "action must be 'approved' or 'rejected'"}, status=status.HTTP_400_BAD_REQUEST)

        session.status = action_type
        session.review_notes = request.data.get("notes", "")
        session.reviewed_at = timezone.now()
        session.save()

        return Response({
            "id": str(session.id),
            "status": session.status,
            "reviewed_at": session.reviewed_at.isoformat(),
        })

    @action(detail=False, methods=["get"])
    def health(self, request):
        """System health check — returns pipeline status."""
        from .embedding import _model
        table = _get_table()
        status_map = {
            "embedding_model": _model is not None,
            "lancedb_ready": table is not None,
            "alerts_pending": len(alert_manager._alerts) > 0,
        }
        # Only embedding_model and lancedb_ready determine health;
        # alerts_pending is informational (0 alerts = healthy).
        all_ok = status_map["embedding_model"] and status_map["lancedb_ready"]
        code = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(status_map, status=code)

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """Return recent system alerts."""
        return Response({"alerts": alert_manager.recent(50)})