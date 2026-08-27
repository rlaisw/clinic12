# Quickstart: Hybrid Router for SQLite storage also aligns with existing patterns
- No new dependencies required

Now let me continue with RAG Pipeline Integration

## Purpose
Quickstart validation guide for the Hybrid Router feature that enables stateful conversation memory and hybrid SQL+vector search in the RAG pipeline.

## Prerequisites
- Clinic11 backend running (Python 3.12+ with Django 5.1)
- Python virtual environment activated
- Dependencies installed: `pip install -r backend/requirements.txt`
- Database migrated: `python manage.py migrate`
- Vector store available: `python manage.py check_rag_storage`
- Doctor user created with appropriate permissions

## Setup Commands

### 1. Clone / Ensure Clinic11 is available
```bash
git clone <clinic11-repo-url>
cd clinic11
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Apply Database Migrations
```bash
python manage.py migrate
```

### 4. Run Database Migrations for New Feature (optional, if not auto-migrated)
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Apply Feature Migrations (if applicable)
```bash
python manage.py makemigrations api.rag
python manage.py migrate
```

### 4. Run Development Server
```bash
python manage.py runserver
```

### 4. Test the Hybrid Query Endpoint
```bash
curl -X POST http://localhost:8000/api/rag/hybrid-query \
  -H "Authorization: Token e429e0ee02046d5c2f3933c26d53cf265872ee94" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me patient history for patient 123"}'
```

### 4. Test Session Endpoint
```bash
curl -X GET "http://localhost:8000/api/rag/session/{session_id}" \
  -H "Authorization: Token e429e0ee02046d5c2f3933c26d53cf265872ee94"
```

### 3. Test Hybrid Query Endpoint
```bash
curl -X POST http://localhost:8000/api/rag/hybrid-query \
  -H "Authorization: Token e429e0ee02046d5c2f3933c26d53cf265872ee94" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me patient history for patient 123"}'
```

### 3. Test Session Endpoint
```bash
curl -X GET "http://localhost:8000/api/rag/session/{session_id}" \
  -H "Authorization: Token e429e0ee02046d5c2f3933c26d53cf265872ee94"
```

### 3. Test Hybrid Query Endpoint
```bash
curl -X POST http://localhost:8000/api/rag/hybrid-query \
  -H "Authorization: Token e429e0ee02046d5c2f3933c26d53cf265872ee94" \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me patient history for patient 123"}'
```

## Expected Outcomes

### Success Criteria (Measurable)
1. **Hybrid query endpoint responds** with HTTP 200 status
2. **Classification response** includes `classification` and `classification_confidence` fields
- **Hybrid results** include both `sql_results` and `vector_results` arrays
- **Session endpoint** returns valid session data with `session_id`, `query_count`, and `context_data`
- **Session endpoint** returns `expires_at` timestamp for 7-day retention

## Expected Response Format Examples

### Success Response Example
```json
{
  "query": "Show me patient history for patient 123",
  "session_id": "sess_abc123def456",
  "classification": "patient_history",
  "classification_confidence": 0.94,
  "query_type": "hybrid",
  "results": [
    {
      "patient_id": 123,
      "source_type": "patient",
      "text_content": "Patient 123 has history of hypertension diagnosed 2020",
      "score": 0.94
    }
  ],
  "sql_results": [
    {
      "patient_id": 123,
      "data": {"chief_complaint": "Hypertension, hypertension"},
      "relevance_score": 0.97
    }
  ],
  "vector_results": [
    {
      "patient_id": 123,
      "text_content": "Patient history includes chronic conditions",
      "similarity_score": 0.91
    }
  ],
  "context_updated": {
    "query_count": 1,
    "patient_context": {"patient_id": 123, "last_query": "2026-08-21"},
    "conversation_summary": "Patient history query received"
  }
]