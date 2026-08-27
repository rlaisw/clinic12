# CocoIndex + LanceDB Embedded RAG Specification

## Description
Build an embedded RAG system using CocoIndex (file processing & embedding pipeline) and LanceDB (vector database) that indexes the existing clinic SQLite database content and makes it searchable through a FastAPI endpoint consumed by Dify chatbot.

## Key Principle
- **No new SQLite database** — reuse the existing clinic DB at `backend/db.sqlite3`
- CocoIndex = file processing pipeline (text extraction, chunking, embedding generation)
- LanceDB = vector storage (embedded database for embedding vectors)
- RAG API = query interface that bridges LanceDB → Dify

## Architecture

```
Flow:
clinic SQLite ──► CocoIndex ──► LanceDB (vectors)
                      ▲
File System ──────────┘
                      │
User Query ──► RAG API ──► LanceDB ──► Dify ──► LLM Response

Pipeline (CocoIndex):
1. Extract text from clinic DB tables (patients, certificates, receipts)
2. Load files from data/files/ (documents, images, audio)
3. Chunk text → generate embeddings → store in LanceDB
4. Monitor for changes (file watcher)

Query (RAG API):
1. Receive query from Dify
2. Embed query → search LanceDB
3. Return top-k relevant chunks → Dify LLM
```

## Success Criteria
- Index all clinic data (patients, certificates, receipts, documents) into LanceDB
- RAG API responds to queries under 500ms
- Dify chatbot returns relevant answers based on clinic data
- Auto-reindex on new file detection

## Functional Requirements
1. **CocoIndex Pipeline**: Extract, chunk, embed, and store clinic data
2. **LanceDB Storage**: Vector tables for text and image embeddings
3. **RAG API**: FastAPI server with `/query`, `/reindex`, `/health` endpoints
4. **File Watcher**: Monitor `data/files/` for new documents
5. **Dify Integration**: Custom tool connecting RAG API to Dify chatbot

## Tables to Index (from existing clinic SQLite)
| Table | Content | Index Strategy |
|-------|---------|----------------|
| api_patient | Patient demographic data | Full text indexing |
| api_sickleavecertificate | Sick leave certificates | Full document + metadata |
| api_receipt | Receipts | Financial + metadata |
| api_patientbackground | Chief complaint, history | Clinical notes |
| api_medicalhistory | Medical conditions | History records |
| api_prescriptionmedication | Prescribed meds | Medication records |

## Constraints
- No new SQLite database
- LanceDB is file-based (embedded), no external DB server needed
- `all-MiniLM-L6-v2` for text embeddings (384-dim)
- Dify server at `172.28.51.12`, app ID `499c376a-73fc-4ce2-b201-d025bbeee56f`

## Integration Points
- Dify chatbot at `https://dify.clinic.com.hk/chat/u3gp6aJ0gKWnEFDr`
- RAG API at `http://172.28.51.11:8001`
- Existing clinic SQLite at `backend/db.sqlite3`