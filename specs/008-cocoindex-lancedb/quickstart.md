# Quickstart Guide: CocoIndex + LanceDB RAG

## Prerequisites
- Python 3.11+ with venv activated (`backend/venv/`)
- Existing clinic SQLite at `backend/db.sqlite3`
- Dify chatbot accessible at `https://dify.clinic.com.hk/chat/u3gp6aJ0gKWnEFDr`

## Quick Validation

### 1. Index All Clinic Data
```bash
cd backend
.\venv\Scripts\python.exe ..\rag\cocoindex_pipeline.py
```
Expected: "Indexed X records" where X > 0

### 2. Test Semantic Search
```bash
.\venv\Scripts\python.exe ..\rag\test_search.py
```
Expected: Returns matching clinic records

### 3. Start RAG API
```bash
.\venv\Scripts\python.exe ..\rag\rag_api.py
```
Expected: Server running on http://0.0.0.0:8001

### 4. Verify API
```powershell
Invoke-RestMethod -Uri "http://localhost:8001/health"
```
Expected: `{"status": "ok"}`

### 5. Query from Dify
Configure Dify custom tool pointing to `http://172.28.51.11:8001/query` and test in chatbot.

## Troubleshooting
| Issue | Fix |
|-------|-----|
| LanceDB not found | Run CocoIndex pipeline first |
| No results | Verify db.sqlite3 has data |
| API won't start | Check port 8001 is free |