# Quickstart Guide: CocoIndex + LanceDB RAG

## Prerequisites
- Python 3.12 with venv (`backend/venv/`) — needs `sentence-transformers` (in `backend/requirements.txt`)
- Existing clinic SQLite at `backend/db.sqlite3`
- Dify chatbot accessible at `https://vps.tailb5775.ts.net/chat/45322G8rzGMEW7WP`

> **Note**: the standalone FastAPI RAG server (`rag/rag_api.py`, old port 8001) is **retired**.
> RAG + SQL now live in the Django backend (`:8000`): `/api/rag/query` and `/api/sql/`, both
> token-protected. See `rag/dify_setup.md` for the token.

## Quick Validation

### 1. Index All Clinic Data
```bash
cd backend
venv/bin/python ../rag/cocoindex_pipeline.py
```
Expected: "Indexed X records" where X > 0

### 2. Test Semantic Search
```bash
venv/bin/python ../rag/test_search.py
```
Expected: Returns matching clinic records

### 3. Start backend (hosts RAG + SQL endpoints)
```bash
bash start-dev.sh    # or: start-all.sh
```
Expected: backend listening on `https://0.0.0.0:8000` (HTTPS, self-signed)

### 4. Verify Endpoints (via Django backend)
```bash
curl -k -X POST https://vps.tailb5775.ts.net:8000/api/rag/query \
  -H "Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9" \
  -H "Content-Type: application/json" -d '{"query":"diabetes","top_k":2}'
curl -k -X POST https://vps.tailb5775.ts.net:8000/api/sql/ \
  -H "Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9" \
  -H "Content-Type: application/json" -d '{"sql":"SELECT COUNT(*) FROM api_patient;"}'
```

### 5. Query from Dify
Configure the Dify workflow (re-import `rag/dify_workflow.json` or edit in console):
- RAG node → `https://vps.tailb5775.ts.net:8000/api/rag/query`, header `Authorization: Token ...`
- SQL node → `https://vps.tailb5775.ts.net:8000/api/sql/`, same header

## Troubleshooting
| Issue | Fix |
|-------|-----|
| LanceDB not found | Run CocoIndex pipeline first |
| No results | Verify db.sqlite3 has data |
| RAG 401 Invalid token | HTTP node missing `Authorization: Token ...` header |
| RAG 503 embedding unavailable | `pip install sentence-transformers` in backend venv; or use `/api/sql/` |
| Backend won't start | Port 8000 busy — `bash start-dev.sh` kills stale listeners |