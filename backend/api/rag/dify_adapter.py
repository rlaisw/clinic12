"""
Dify chat adapter: bridges the Clinic RAG backend with the Dify chatbot interface.
Accepts chat messages from Dify, performs vector search, and returns context.
"""

import logging
import uuid
from typing import Optional

import httpx
from django.conf import settings

from .embedding import embed_text

logger = logging.getLogger(__name__)


def search_context(query: str, top_k: int = 5) -> list[dict]:
    """
    Search LanceDB for medical context matching *query*.
    Returns a list of dicts with text_content, source_type, and score.
    """
    vec = embed_text(query)
    if vec is None:
        logger.warning("embedding model unavailable — zero context returned")
        return []

    import lancedb
    uri = getattr(settings, "LANCEDB_URI", "lancedb")
    try:
        db = lancedb.connect(uri)
        table = db.open_table("clinical_embeddings")
    except Exception:
        logger.exception("cannot open LanceDB table")
        return []

    results = table.search(vec).limit(top_k).to_list()
    return [
        {
            "text_content": r.get("text_content", ""),
            "source_type": r.get("source_type"),
            "score": round(r.get("_distance", 0), 4),
        }
        for r in results
    ]


async def forward_to_dify(
    session_id: str,
    query: str,
    context: list[dict],
) -> Optional[str]:
    """
    Forward the augmented query to the Dify server and return the bot reply.
    The context list is injected into the Dify message as a system prompt.
    """
    dify_url = getattr(settings, "DIFY_BASE_URL", None)
    dify_api_key = getattr(settings, "DIFY_API_KEY", None)
    if not dify_url:
        logger.error("DIFY_BASE_URL not configured")
        return None

    context_block = "\n\n".join(
        f"- [{r['source_type']}] {r['text_content']}" for r in context if r.get("text_content")
    )
    payload = {
        "inputs": {"context": context_block},
        "query": query,
        "response_mode": "blocking",
        "user": "clinic_rag",
    }
    # Dify requires conversation_id to be a valid UUID; omit if missing
    if session_id:
        try:
            uuid.UUID(session_id)
            payload["conversation_id"] = session_id
        except ValueError:
            pass

    headers = {}
    if dify_api_key:
        headers["Authorization"] = f"Bearer {dify_api_key}"

    async with httpx.AsyncClient(timeout=30, verify=False) as client:
        resp = await client.post(
            f"{dify_url}/v1/chat-messages",
            headers=headers,
            json=payload,
        )
    if resp.is_error:
        logger.error("Dify returned %s: %s", resp.status_code, resp.text)
        return None
    data = resp.json()
    return data.get("answer")