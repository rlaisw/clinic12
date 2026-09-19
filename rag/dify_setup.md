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

## SQL Tool Behavior (as of latest backend)

The `/api/sql/` endpoint is tolerant of LLM-generation quirks:

- **Trailing prose recovery**: if the model appends commentary ("...But first check...") without a terminating `;`, the backend finds the longest executable prefix of the statement and returns its rows instead of a `syntax error` (`_executable_prefix` in `backend/api/views.py`).
- **Reasoning-preamble stripping**: `thinking / reasoning ... response` blocks before the SQL are removed automatically.
- **Fenced blocks**: plain or ` ```sql ` fenced statements are extracted.
- **Schema steering**: `/api/sql/schema` describes each table and steers the bot to the right one (see the `TABLE_NOTES` dict in `sql_query`/`sql_schema`). Notably:
  - `api_medication_history` is a **combined VIEW** (category, medication_name, dosage, route, frequency, days_supply, start_date, diagnostic_result) unioning `api_activemedication`, `api_pastmedication`, and `api_prescriptionmedication`. The bot is steered to use it for ANY "what medications did / took / is taking" question.
  - `api_medicalhistory` (patient conditions) is auto-populated whenever a diagnosis is recorded from a certificate, receipt, prescription, or active medication (`record_diagnosis` post-save signal in `backend/api/rag/signals.py`).

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
   - **LLM Node** with system prompt (see `rag/dify_workflow.yml` / `rag/dify_workflow.json` for the authoritative copy — re-import these when the prompt changes):
     ```
     You are a medical clinic assistant. Answer the doctor's question concisely
     using ONLY the clinic records provided in the context. If the context doesn't
     contain relevant information, say so.
     - SQL result: rows is a JSON array; rows[0] holds the first row. Read the
       value from rows[0] (e.g. {"COUNT(*)": 30} means 30).
     - Reply with one short factual sentence. No thinking, no tools, no search.
     - ALWAYS end generated SQL with a semicolon (;) and never append prose after it.
     - Use api_medication_history for any medication-history question; join api_patient
       on patient_id and filter start_date for time ranges (e.g. start_date >= date('now','-6 months')).
     Context: {{http_response.results}} / {{sql_response}}
     ```
   - **End**: Return LLM answer

3. **Publish** the workflow

> **Important**: the SQL/RAG nodes must send `Authorization: Token 54a8fa6b6fbe82b3c54a9755563a58e80642cad9`.
> Missing/invalid token → `401 {"detail":"Invalid token."}`. The answer node must read `rows[0]` from the SQL result,
> otherwise the model ignores it and hallucinates (e.g. tries a nonexistent `search` tool).

## Step 4: Test

Open `https://vps.tailb5775.ts.net/chat/z0RCp1YQHYqySPZF` and ask questions like:
- "How many patients?" → bot generates `SELECT COUNT(*) FROM api_patient;` → 30
- "Tell me what medications Raymond Lai took in the last 6 months" → bot queries `api_medication_history` joined with `api_patient` and returns the complete active + past + prescription list
- "Show me the medical history of Raymond Lai" → bot queries `api_medicalhistory` (auto-populated from diagnoses)
- "Show me sick leave certificates with diagnosis of fever"
- "What receipts were issued recently?"

## Troubleshooting
| Symptom | Check |
|---------|-------|
| Connection refused | Backend not running on vps.tailb5775.ts.net:8000 (`bash start-dev.sh`) |
| `401 Invalid token.` | HTTP node missing/stale `Authorization: Token ...` header |
| `403 no SELECT or WITH query` | SQL node sent non-SQL (e.g. reasoning text) — bind the LLM's SQL output, not the raw chat |
| `400 near "But": syntax error` | The model appended prose without `;` — the current backend recovers via `_executable_prefix`; update to the latest backend and re-test. Also check the workflow prompt ends SQL with `;` |
| Medication-history answer only shows one table | Bot queried `api_activemedication` alone. Re-import the updated workflow (steers to `api_medication_history` view) and confirm `api_medication_history` appears in `/api/sql/schema` |
| "No medical history found" for a real patient | Diagnosis data was recorded before the auto-populate signal existed. Backfill once: `./venv/bin/python manage.py shell` and run the diagnosis→`MedicalHistory` sync (see `record_diagnosis` in `backend/api/rag/signals.py`) |
| Empty RAG results | Run cocoindex_pipeline.py first to index data |
| RAG `503 embedding model unavailable` | `sentence-transformers` not installed / LanceDB not populated — use `/api/sql/` instead |
| Wrong answers | Lower _distance = more relevant; check query phrasing |

## Re-applying Workflow Changes
The canonical workflow definition lives in the repo at `rag/dify_workflow.yml` / `rag/dify_workflow.json`. After editing the prompt (e.g. new table steering), re-import that workflow into Dify Studio and republish it so the live bot picks up the change — the repo file alone does not update the running Dify app.