# Tasks: CocoIndex + LanceDB Embedded RAG

## Phase 1: Setup

- [X] T001 Create feature spec directory structure (specs/008-cocoindex-lancedb)
- [X] T002 Update .gitignore for lancedb_data/, coco_state/ 
- [X] T003 Verify Python dependencies installed (lancedb, fastapi, uvicorn, pypdf2, sentence-transformers)

## Phase 2: Core — CocoIndex Pipeline

- [X] T004 Implement cocoindex_pipeline.py: extract text from all clinic SQLite tables
- [X] T005 Implement text chunking strategy per table type
- [X] T006 Implement embedding generation using all-MiniLM-L6-v2
- [X] T007 Implement LanceDB storage with text_embeddings table schema

## Phase 3: Core — RAG API

- [X] T008 Build FastAPI server with /query, /reindex, /health endpoints
- [X] T009 Implement semantic search function: embed query → LanceDB search → return results
- [X] T010 Implement /reindex endpoint that re-runs CocoIndex pipeline
- [X] T011 Test RAG API with curl/PowerShell

## Phase 4: Integration

- [X] T012 Implement file_watcher.py for data/files/ monitoring
- [ ] T013 Write dify_setup.md with step-by-step Dify custom tool configuration
- [ ] T014 Configure CORS and integrate with Dify chatbot

## Phase 5: Polish

- [X] T015 Write self-check test for CocoIndex pipeline
- [X] T016 Write end-to-end test: index -> query -> verify results
- [X] T017 Add performance benchmarking for query response time (<500ms)
- [X] T018 Final validation against specification

## Dependencies
- T003 → T004 (deps before code)
- T004 → T005 → T006 → T007 (pipeline chain)
- T007 → T008 → T009 → T010 (API depends on indexing)
- T010 → T011 (implementation before testing)
- T011 → T0012 (API working before file watcher)
- T014 → T013 (integration before documentation)

## Parallel Opportunities
- [P] T001, T002, T003 (setup tasks)
- [P] T005, T006 (chunking and embedding can be developed together)
- [P] T015, T016 (tests)