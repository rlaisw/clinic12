# API Contracts: CocoIndex + LanceDB RAG

## RAG API Endpoints

### POST /query
Semantic search over indexed clinic data.

**Request:**
```json
{
  "query": "string (required) - natural language question",
  "top_k": "integer (optional, default 5) - number of results"
}
```

**Response (200):**
```json
{
  "results": [
    {
      "id": "string - chunk UUID",
      "text": "string - matched text content",
      "source_type": "string - table name (api_patient, api_sickleavecertificate, etc.)",
      "source_id": "integer - PK of source row",
      "patient_id": "integer | null",
      "_distance": "float - cosine distance (lower = more relevant)"
    }
  ],
  "total": "integer - result count"
}
```

**Error (400):** `{"detail": "Query cannot be empty"}`

### POST /reindex
Re-run the CocoIndex pipeline to refresh all embeddings.

**Request:** empty body

**Response (200):**
```json
{
  "status": "ok",
  "records_indexed": "integer - total records processed"
}
```

**Error (500):** `{"detail": "error message"}`

### GET /health
Health check.

**Response (200):**
```json
{
  "status": "ok"
}
```

## Dify Custom Tool Configuration
| Field | Value |
|-------|-------|
| Name | Clinic RAG Query |
| API Endpoint | http://172.28.51.11:8001/query |
| Method | POST |
| Headers | Content-Type: application/json |

## Data Exfiltration Rules
- RAG API returns only text content (no PHI beyond what's in the source tables)
- Query endpoint is internal (Dify server → RAG API, not public)