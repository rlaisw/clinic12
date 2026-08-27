# Dify Configuration Guide: Clinic RAG Custom Tool

## Architecture
```
User Chat ──► Dify Chatbot ──► RAG API (http://172.28.51.11:8001/query)
                                    │
                                    ▼
                               LanceDB (embedded vector DB)
                                    │
                                    ▼
                              CocoIndex (pipeline)
                                    │
                                    ▼
                          Existing Clinic SQLite (read-only)
```

## Step 1: Verify RAG API is Running
```powershell
Invoke-RestMethod -Uri "http://172.28.51.11:8001/health"
# Expected: {"status": "ok"}
```

## Step 2: Create Dify Custom Tool

1. **Login** to Dify at `https://dify.clinic.com.hk`
2. Navigate to **Tools** → **Custom Tools** → **Create Custom Tool**
3. Configure:

   | Field | Value |
   |-------|-------|
   | Name | `Clinic RAG Query` |
   | Description | `Search clinic database using semantic RAG` |
   | API Endpoint URL | `http://172.28.51.11:8001/query` |
   | Method | `POST` |
   | Headers | `Content-Type: application/json` |

4. **Request Body Schema** (JSON):
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
   - **HTTP Request**: POST to `http://172.28.51.11:8001/query` with body `{"query": "{{question}}", "top_k": 5}`
   - **LLM Node** with system prompt:
     ```
     You are a medical clinic assistant. Answer the doctor's question concisely
     using ONLY the clinic records provided in the context. If the context doesn't
     contain relevant information, say so.
     Context: {{http_response.results}}
     ```
   - **End**: Return LLM answer

3. **Publish** the workflow

## Step 4: Test

Open `https://dify.clinic.com.hk/chat/u3gp6aJ0gKWnEFDr` and ask questions like:
- "What patients have been prescribed medications?"
- "Show me sick leave certificates with diagnosis of fever"
- "What receipts were issued recently?"

## Troubleshooting
| Symptom | Check |
|---------|-------|
| Connection refused | RAG API not running on 172.28.51.11:8001 |
| Empty results | Run cocoindex_pipeline.py first to index data |
| Wrong answers | Lower _distance = more relevant; check query phrasing |