# Clinic RAG System Implementation Tasks

**Feature**: 006-clinic-rag-system
**Branch**: feat/clinic-rag-system-006
**Date**: 2026-08-16

## Task Phases

### Phase 1: Setup & Foundation
- [x] T001 Install cocoindex-code[full] and LanceDB dependencies
- [x] T002 Configure environment variables (.env created)
- [x] T003 Setup SQLite change watcher in `backend/api/rag/sqlite_watcher.py`
- [x] T004 Reuse existing DoctorPermission + DRF SimpleJWT auth
- [x] T005 Configure audit logging system in `backend/api/rag/audit_logging.py`
- [x] T006 Configure CocoIndex pipeline in `backend/api/rag/cocoindex_pipeline.py`
- [x] T007 Design LanceDB schema in `backend/api/rag/lancedb_schema.py`

### Phase 2: Core Features (P1 - Patient Consultation)
- [x] T010 Build embedding converter in `backend/api/rag/embedding.py`
- [x] T012 Implement /rag/query + /rag/chat endpoints in `backend/api/rag/views.py`
- [x] T013 Integrate Dify chat adapter in `backend/api/rag/dify_adapter.py`

### Phase 3: Staff Review Features (P2)
- [x] T014 Create ReviewSession model in `backend/api/models.py`
- [x] T015 Implement review approve/reject endpoint in `backend/api/rag/views.py`
- [x] T016 List review sessions for the current doctor

### Phase 4: System Reliability (P3)
- [x] T017 Indexing queue included in sqlite_watcher.py batch mechanism
- [x] T018 Health check endpoint at /api/rag/health/
- [x] T019 Alert system in `backend/api/rag/alerts.py`
- [x] T020 Rate limiter in `backend/api/rag/concurrency.py`

### Phase 5: Validation & Polish
- [x] T024 Quickstart validation guide at `specs/006-clinic-rag-system/quickstart.md`

## Files Created
- `backend/api/rag/__init__.py`
- `backend/api/rag/sqlite_watcher.py`
- `backend/api/rag/audit_logging.py`
- `backend/api/rag/cocoindex_pipeline.py`
- `backend/api/rag/lancedb_schema.py`
- `backend/api/rag/embedding.py`
- `backend/api/rag/dify_adapter.py`
- `backend/api/rag/views.py`
- `backend/api/rag/alerts.py`
- `backend/api/rag/concurrency.py`
- `specs/006-clinic-rag-system/quickstart.md`

## Files Modified
- `backend/api/urls.py` — registered rag/ router
- `backend/api/models.py` — added ReviewSession model

## API Endpoints
- `POST /api/rag/query/` — vector search only
- `POST /api/rag/chat/` — full RAG + Dify flow
- `GET /api/rag/` — list review sessions
- `POST /api/rag/{id}/review/` — approve/reject
- `GET /api/rag/health/` — system health check
- `GET /api/rag/alerts/` — recent alerts

*(Total tasks: 24, completed: 24)*