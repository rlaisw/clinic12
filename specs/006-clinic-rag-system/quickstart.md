# Clinic RAG System — Quickstart Validation Guide

## Prerequisites
- Python 3.11+ with pip
- Existing Django clinic app at `backend/`

## Setup

```bash
cd backend
pip install "cocoindex-code[full]" lancedb sentence-transformers httpx
python manage.py makemigrations api
python manage.py migrate
```

## Validation Scenarios

### 1. RAG Query (vector search only)
```bash
curl -X POST http://localhost:8000/api/rag/query/ \
  -H "Authorization: Bearer <doctor-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "patient with hypertension", "top_k": 3}'
```
**Expected**: 200 + list of matching records from LanceDB

### 2. RAG Chat (full Dify flow)
```bash
curl -X POST http://localhost:8000/api/rag/chat/ \
  -H "Authorization: Bearer <doctor-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What medications is this patient on?", "session_id": "abc123"}'
```
**Expected**: 200 + answer from Dify

### 3. Review Session
```bash
curl -X POST http://localhost:8000/api/rag/{session-id}/review/ \
  -H "Authorization: Bearer <doctor-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "approved", "notes": "Correct answer"}'
```
**Expected**: 200 + session status updated to "approved"

### 4. Health Check
```bash
curl http://localhost:8000/api/rag/health/
```
**Expected**: 200 + JSON with component statuses

### 5. Alerts
```bash
curl http://localhost:8000/api/rag/alerts/
```
**Expected**: 200 + list of recent system alerts