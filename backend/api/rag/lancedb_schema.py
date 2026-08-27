"""
LanceDB schema definition for clinical embeddings storage.
Uses the LanceDB Python SDK to define table structure and indices.
"""

from dataclasses import dataclass
from typing import Optional
import lancedb
import pyarrow as pa


@dataclass
class ClinicalEmbeddingSchema:
    """
    Arrow-based schema for the clinical_embeddings table.
    Each row stores one text chunk + its embedding vector + metadata.
    """
    @staticmethod
    def arrow_schema() -> pa.schema:
        return pa.schema([
            pa.field("id", pa.uint64(), nullable=False),
            pa.field("patient_id", pa.uint64(), nullable=False),
            pa.field("embedding", pa.list_(pa.float32(), 384), nullable=False),
            pa.field("text_content", pa.utf8()),
            pa.field("source_type", pa.utf8()),
            pa.field("source_table", pa.utf8()),
            pa.field("source_id", pa.uint64()),
            pa.field("timestamp", pa.timestamp("us")),
        ])

    INDEX_CONFIG = {
        "metric": "cosine",
        "num_partitions": 256,
        "num_sub_vectors": 96,
    }


async def ensure_table(uri: str) -> None:
    """Create or open the clinical_embeddings table in LanceDB."""
    db = await lancedb.connect_async(uri)
    try:
        await db.open_table("clinical_embeddings")
    except Exception:
        schema = ClinicalEmbeddingSchema.arrow_schema()
        await db.create_table("clinical_embeddings", schema=schema)
    finally:
        await db.close()