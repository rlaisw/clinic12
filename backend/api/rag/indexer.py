"""
Incremental indexer: on Django model save/delete, upsert one record's text
embedding into LanceDB so RAG search reflects live data (Option A).
"""

import logging
import hashlib
from datetime import datetime, timezone

from .embedding import embed_text
from .cocoindex_pipeline import create_default_pipeline, MedicalTextProcessor

logger = logging.getLogger(__name__)

_pipeline = create_default_pipeline()
_SOURCES = {s.table: s for s in _pipeline.sources}  # db_table -> SourceConfig


def _stable_id(source_table: str, source_id: int) -> int:
    """Deterministic 56-bit id (stable across processes, fits signed 64-bit)."""
    return int.from_bytes(hashlib.md5(f"{source_table}:{source_id}".encode()).digest()[:7], "big")


def _table():
    import lancedb
    from django.conf import settings
    from .lancedb_schema import ClinicalEmbeddingSchema
    uri = getattr(settings, "LANCEDB_URI", "lancedb")
    db = lancedb.connect(uri)
    try:
        return db.open_table("clinical_embeddings")
    except Exception:
        db.create_table("clinical_embeddings", schema=ClinicalEmbeddingSchema.arrow_schema())
        return db.open_table("clinical_embeddings")


def index_record(model, instance) -> None:
    """Upsert a single record into LanceDB. No-op if table/embedding unavailable."""
    source = _SOURCES.get(instance._meta.db_table)
    if source is None:
        return
    record = {f.name: getattr(instance, f.name) for f in instance._meta.fields}
    text = MedicalTextProcessor.preprocess_record(record, source)["text_content"]
    if not text:
        return
    vec = embed_text(text)
    if vec is None:
        logger.warning("embedding model unavailable; skipped %s#%s", source.table, instance.id)
        return
    table = _table()
    if table is None:
        return
    patient_id = getattr(instance, "patient_id", None) or instance.id
    table.delete(f"source_table = '{source.table}' AND source_id = {instance.id}")
    table.add([{
        "id": _stable_id(source.table, instance.id),
        "patient_id": patient_id,
        "embedding": vec,
        "text_content": text,
        "source_type": source.table,
        "source_table": source.table,
        "source_id": instance.id,
        "timestamp": datetime.now(timezone.utc),
    }])
    logger.info("indexed %s#%s", source.table, instance.id)


def unindex_record(model, instance) -> None:
    """Delete a record's rows from LanceDB on model delete."""
    source = _SOURCES.get(instance._meta.db_table)
    if source is None:
        return
    table = _table()
    if table is None:
        return
    table.delete(f"source_table = '{source.table}' AND source_id = {instance.id}")
