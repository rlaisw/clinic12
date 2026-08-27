# Implementation Plan: CocoIndex + LanceDB Embedded RAG

## Summary
Build an embedded RAG system with CocoIndex (processing pipeline) and LanceDB (vector database) that indexes the existing clinic database and file uploads, providing semantic search via a FastAPI endpoint consumed by Dify chatbot.

## Tech Stack
- **Language**: Python 3.11+
- **Vector DB**: LanceDB (embedded, file-based)
- **Embedding**: sentence-transformers/all-MiniLM-L6-v2
- **API Framework**: FastAPI + uvicorn
- **File Processing**: PyPDF2, python-docx (future)
- **Existing DB**: Django SQLite (read-only access via sqlite3)
- **Chatbot**: Dify (already deployed at dify.clinic.com.hk)

## Project Structure
```
rag/
├── rag_engine.py         # Core: SQLite reader → LanceDB indexer → search
├── rag_api.py            # FastAPI server: /query, /reindex, /health
├── cocoindex_pipeline.py # CocoIndex orchestration: extract → chunk → embed → store
├── file_watcher.py       # File system monitor for data/files/
├── dify_setup.md         # Dify configuration guide
└── test_search.py        # Quick search verification script

coco_state/               # Pipeline state (file hashes, last indexed IDs)
lancedb_data/             # LanceDB vector database files
data/files/               # Uploaded document storage
├── documents/
├── images/
└── audio/
```

## Phases
1. **Setup**: Directory structure, dependencies, .gitignore updates
2. **Core**: CocoIndex pipeline → LanceDB indexing → RAG API
3. **Integration**: File watcher, Dify tool configuration
4. **Polish**: Tests, verification, documentation

## Constitution Check
- Uses existing SQLite (read-only) — no new DB
- No new external dependencies beyond already-installed: lancedb, fastapi, uvicorn, pypdf2, sentence-transformers
- Follows embedded DB pattern (no server process needed for LanceDB)