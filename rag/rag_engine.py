"""
RAG Engine: LanceDB wrapper for embedded vector storage.
Thin layer over LanceDB — connect, search, table management.
No SQLite, no indexing — that's CocoIndex's job.
"""
import os
import lancedb
import pyarrow as pa

LANCEDB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lancedb_data")
os.makedirs(LANCEDB_PATH, exist_ok=True)


def init_lancedb():
    return lancedb.connect(LANCEDB_PATH)


def get_or_create_text_table(db):
    try:
        return db.open_table("text_embeddings")
    except:
        schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("text", pa.string()),
            pa.field("source", pa.string()),
            pa.field("source_id", pa.string()),
            pa.field("source_type", pa.string()),
            pa.field("patient_id", pa.string()),
            pa.field("embedding", pa.list_(pa.float32(), 384)),
        ])
        return db.create_table("text_embeddings", schema=schema, mode="overwrite")


def search(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    db = init_lancedb()
    try:
        table = db.open_table("text_embeddings")
    except:
        return []
    results = table.search(query_embedding).limit(top_k).to_list()
    return results