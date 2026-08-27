# Tasks: Hybrid Router for SQLite Data Retrieval

## Prerequisites
- plan.md (required)
- spec.md (required for user stories)
- research.md, data-model.md, contracts/ (optional)

## Path Conventions
Paths shown assume `backend/` structure (Django project)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize Python project with Django and REST framework dependencies
- [x] T003 [P] Configure linting and formatting tools (flake8, black)
- [x] T004 Setup version control hooks (git hooks)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T005 Add conversation session tracking fields to ConversationSession model
- [x] T006 [P] Implement database schema migration for conversation session tables
- [x] T007 Create base models for QueryClassificationService and ContextRetentionManager
- [x] T008 Configure database connection settings for SQLite with TTL support
- [x] T009 Setup error handling and logging infrastructure for RAG router
- [x] T010 [P] Setup API routing and middleware structure for hybrid router endpoints

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Context-Aware Query Handling (Priority: P1) 🎯 MVP

**Goal**: Implement hybrid router that classifies queries and routes to SQL or vector search

**Independent Test**: Hybrid query endpoint returns correct classification and merged results

### Implementation for User Story 1

- [x] T011 [P] [US1] Record conversation context in ConversationSession.context_data (covers PatientContextCache) in `backend/api/models.py`
- [x] T012 [US1] Implement QueryClassificationService in `backend/api/rag/query_classifier.py`
- [x] T013 [US1] Implement ContextRetentionManager in `backend/api/rag/context_manager.py`
- [x] T014 [US1] Implement HybridRouter in `backend/api/rag/hybrid_router.py` + `hybrid_query` action in `backend/api/rag/views.py`
- [x] T015 [US1] Add validation and error handling to HybridRouter
- [x] T016 [US1] Add logging for user story 1 operations
- [x] T017 [US1] Add conversation_sessions migration to database schema (`api/00017_conversationsession`)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Stateful Memory Implementation (Priority: P2)

**Goal**: Implement session persistence and continuity across multiple queries

**Independent Test**: Session context persists across multiple queries and maintains conversation history

### Implementation for User Story 2

- [x] T018 [P] [US2] Extend ConversationSession model with session_id and expiry fields
- [x] T019 [US2] Implement session persistence in ContextRetentionManager
- [x] T020 [US2] Add automated cleanup of expired sessions
- [x] T021 [US2] Enhance QueryClassificationService for session-aware classification
- [x] T022 [US2] Enhance HybridRouter to support multi-turn context
- [x] T023 [US2] Add security for session access control
- [ ] T024 [US2] Add performance metrics tracking for session handling
- [x] T025 [US2] Update API endpoints in contracts for session management

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T026 [P] Documentation updates in specs/007-rag-hybrid-router/
- [x] T027 Code cleanup and refactoring of existing rag components
- [ ] T028 [P] Performance optimization across all stories
- [x] T029 Add security hardening for all new components
- [x] T030 Run quickstart.md validation
- [x] T031 Final review and checklist validation
- [x] T032 [P] Additional unit tests for edge cases (`api/rag/tests.py`)
- [x] T033 Create contracts/api-endpoint.md for hybrid router API specification
- [x] T034 [P] Create tests/integration/ for validation scenarios (`hybrid_contract_check.py`)
- [x] T035 Run test suite with `python manage.py test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Independent
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- User Story tasks [P] can run in parallel once Foundational completes
- Multiple User Story implementation tasks can run concurrently

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label (US1, US2) maps task to specific user story for traceability
- Each user story is independently completeable and testable
- Verify tests pass after each phase