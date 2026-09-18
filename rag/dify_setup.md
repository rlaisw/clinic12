# Dify Configuration Guide: Clinic RAG + SQL Custom Tools

## Architecture
```
User Chat ──► Dify Chatbot ──► RAG API (https://vps.tailb5775.ts.net:8000/api/rag/query)
                                    │
                                    ▼
                              LanceDB (embedded vector DB)
                                    │
                                    ▼
                              CocoIndex (pipeline)
                                    │
                                    ▼
                          Existing Clinic SQLite (read-only)

User Chat ──► Dify Chatbot ──► SQL API (https://vps.tailb5775.ts.net:8000/api/sql/)
                                    ▼
                          Clinic SQLite (read-only, LIMIT 200)
```

Both endpoints live in the Django backend (`backend/api/views.py`, `backend/api/rag/views.py`).
Both are **token-protected** (DRF `TokenAuthentication`) — send `Authorization: Token <token>`.

**Auth token (doctor user)**: `54a8fa6b6fbe82b3c54a9755563a58e80642cad9`
(Regenerate if rotated: `./venv/bin/python manage.py shell -c "from rest_framework.authtoken.models import Token; from django.contrib.auth import get_user_model; print(Token.objects.get_or_create(user=get_user_model().objects.get(username='doctor'))[0].key)"`)

## Step 1: Verify Endpoints Are Running
```bash
# RAG (vectors)
curl -k -X POST https://vps.tailb5775.ts.net:8000/api/rag/query \
  -H "Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9" \
  -H "Content-Type: application/json" \
  -d '{"query":"diabetes patient","top_k":2}'

# SQL (exact/summary queries)
curl -k -X POST https://vps.tailb5775.ts.net:8000/api/sql/ \
  -H "Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM api_patient;"}'
# → {"total":1,"rows":[{"COUNT(*)":30}]}
```

**Prerequisite for RAG**: `sentence-transformers` in the backend venv (added to `backend/requirements.txt`) +
LanceDB index populated (`rag/cocoindex_pipeline.py`). If vector store is unavailable the RAG endpoint returns 503 —
use the `/api/sql/` endpoint instead (it needs no embedding model).

## Step 2: Create Dify Custom Tools

1. **Login** to Dify at `https://vps.tailb5775.ts.net/dify/` (proxied by `apps/web/server.js`)
2. Navigate to **Workflow** → the chatbot app → add HTTP request nodes.

### Tool A — RAG query (semantic)
| Field | Value |
|-------|-------|
| Method | `POST` |
| API Endpoint URL | `https://vps.tailb5775.ts.net:8000/api/rag/query` |
| Headers | `Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9`, `Content-Type: application/json` |

**Request Body Schema** (JSON):
   ```json
   {
     "type": "object",
     "required": ["query"],
     "properties": {
       "query": {
         "type": "string",
         "description": "Natural language medical question (e.g., 'patients with headache')"
       },
       "top_k": {
         "type": "integer",
         "description": "Number of results (default 5)",
         "default": 5
       }
     }
   }
   ```

5. **Response Schema** (JSON):
   ```json
   {
     "type": "object",
     "properties": {
       "results": {
         "type": "array",
         "items": {
           "type": "object",
           "properties": {
             "id": {"type": "string"},
             "text": {"type": "string", "description": "Matched clinic record text"},
             "source_type": {"type": "string", "description": "Table source (patient, receipt, certificate, etc.)"},
             "source_id": {"type": "string"},
             "patient_id": {"type": "string"},
             "_distance": {"type": "number", "description": "Relevance score (lower = better)"}
           }
         }
       },
       "total": {"type": "integer"}
     }
   }
   ```

## Step 3: Create Dify Workflow

1. **Studio** → **Create Workflow**
2. Add nodes:
   - **Start**: Input `question` (string)
   - **HTTP Request (RAG)**: POST to `https://vps.tailb5775.ts.net:8000/api/rag/query`, header `Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9`, body `{"query": "{{question}}", "top_k": 5}`
   - **HTTP Request (SQL)**: for count/summary questions call `https://vps.tailb5775.ts.net:8000/api/sql/` with `{"sql": "<SQLITE SELECT>"}` and the same token header. The backend extracts one statement (plain or fenced ` ```sql ` blocks) and returns `{"total": n, "rows": [...]}`.
   - **LLM Node** with system prompt:
     ```
     You are a medical clinic assistant. Answer the doctor's question concisely
     using ONLY the clinic records provided in the context. If the context doesn't
     contain relevant information, say so.
     - SQL result: rows is a JSON array; rows[0] holds the first row. Read the
       value from rows[0] (e.g. {"COUNT(*)": 30} means 30).
     - Reply with one short factual sentence. No thinking, no tools, no search.
     Context: {{http_response.results}} / {{sql_response}}
     ```
   - **End**: Return LLM answer

3. **Publish** the workflow

> **Important**: the SQL/RAG nodes must send `Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9`.
> Missing/invalid token → `401 {"detail":"Invalid token."}`. The answer node must read `rows[0]` from the SQL result,
> otherwise the model ignores it and hallucinates (e.g. tries a nonexistent `search` tool).

## Step 4: Test

Open `https://vps.tailb5775.ts.net/chat/45322G8rzGMEW7WP` and ask questions like:
- "How many patients?" → bot generates `SELECT COUNT(*) FROM api_patient;` → 30
- "What patients have been prescribed medications?"
- "Show me sick leave certificates with diagnosis of fever"
- "What receipts were issued recently?"

## Troubleshooting
| Symptom | Check |
|---------|-------|
| Connection refused | Backend not running on vps.tailb5775.ts.net:8000 (`bash start-dev.sh`) |
| `401 Invalid token.` | HTTP node missing/stale `Authorization: Token ...` header |
| `403 no SELECT or WITH query` | SQL node sent non-SQL (e.g. reasoning text) — bind the LLM's SQL output, not the raw chat |
| `400 one statement at a time` | Trailing `;` + newline — backend now strips it; retry after backend restart |
| Empty RAG results | Run cocoindex_pipeline.py first to index data |
| RAG `503 embedding model unavailable` | `sentence-transformers` not installed / LanceDB not populated — use `/api/sql/` instead |
| Wrong answers | Lower _distance = more relevant; check query phrasing |