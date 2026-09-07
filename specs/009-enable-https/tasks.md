---
description: "Task list for feature implementation"
---

# Tasks: Enable HTTPS

**Input**: Design documents from `specs/009-enable-https/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included per user request ("create test cases and add error handling"). Tests are written FIRST and must FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/` (Next.js)
- **Backend**: `backend/` (Django)
- **Certificates**: `certs/` at project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for HTTPS support

- [x] T001 Create `certs/` directory with `.gitignore` entry for `*.key` at `certs/.gitignore`
- [x] T002 Create OpenSSL config file with SANs at `certs/openssl.cnf`
- [x] T003 Create certificate generation script with error handling at `certs/generate.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core certificate infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Generate the self-signed certificate by running `bash certs/generate.sh` from project root
- [x] T005 [P] Verify certificate properties — CN, SANs, 30-year validity, RSA 4096 at `certs/verify_cert.sh`
- [x] T006 Update root `.gitignore` to exclude `certs/*.key` if not already covered

**Checkpoint**: Certificate generated and validated — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Clinic App over HTTPS (Priority: P1) 🎯 MVP

**Goal**: Users can access the clinic web app at `https://kilo.clinic.com.hk:3001` with encrypted credentials

**Independent Test**: Navigate to `https://kilo.clinic.com.hk:3001/login` in a browser, accept the self-signed certificate warning, and see the login form loading securely.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Test certificate CN and SAN validation in `certs/test_https.sh`
- [x] T008 [P] [US1] Test frontend HTTPS connectivity — `curl -k https://kilo.clinic.com.hk:3001/login` returns 200 in `certs/test_https.sh`

### Implementation for User Story 1

- [x] T009 [US1] Create Next.js HTTPS dev server at `apps/web/server.js` (Node.js https.createServer wrapping Next.js app)
- [x] T010 [US1] Update `apps/web/package.json` dev script to `node server.js`
- [x] T011 [US1] Create `apps/web/.env.local` with `NEXT_PUBLIC_API_URL=https://kilo.clinic.com.hk:8000/api`
- [x] T012 [US1] Add error handling for missing cert/key files in `apps/web/server.js`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Backend API Serves over HTTPS (Priority: P2)

**Goal**: The Django backend API is accessible over HTTPS at `https://kilo.clinic.com.hk:8000`

**Independent Test**: `curl -k https://kilo.clinic.com.hk:8000/api/` returns a JSON response over a secure connection.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US2] Test backend HTTPS connectivity — `curl -k https://kilo.clinic.com.hk:8000/api/` returns response in `certs/test_https.sh`
- [x] T014 [P] [US2] Test backend login endpoint over HTTPS — `curl -k -X POST https://kilo.clinic.com.hk:8000/api/auth/login/` returns 200 with token in `certs/test_https.sh`

### Implementation for User Story 2

- [x] T015 [US2] Add `django-extensions` to `backend/requirements.txt`
- [x] T016 [US2] Update `backend/config/settings.py` — add `kilo.clinic.com.hk:3001` to `CORS_ALLOWED_ORIGINS`
- [x] T017 [US2] Create backend HTTPS startup script with error handling at `backend/run_https.sh`
- [x] T018 [US2] Add pre-flight checks for cert/key file existence in `backend/run_https.sh`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Certificate Validity Duration (Priority: P3)

**Goal**: The self-signed certificate is valid for 30 years with correct RSA 4096-bit key and domain SANs

**Independent Test**: Inspect the certificate with `openssl x509 -noout -dates -text` and confirm 30-year validity, RSA 4096, and SANs include `kilo.clinic.com.hk` and `clinic.com.hk`.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US3] Test certificate validity period — notAfter is ~30 years in future in `certs/test_https.sh`
- [x] T020 [P] [US3] Test certificate key size — RSA 4096-bit in `certs/test_https.sh`
- [x] T021 [P] [US3] Test certificate SANs — includes `kilo.clinic.com.hk` and `clinic.com.hk` in `certs/test_https.sh`

### Implementation for User Story 3

- [x] T022 [US3] Document certificate validation steps in `specs/009-enable-https/quickstart.md`
- [x] T023 [US3] Add troubleshooting section to `specs/009-enable-https/quickstart.md`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T024 [P] Update root `package.json` dev script to support HTTPS mode alongside HTTP
- [x] T025 [P] Test error handling scenarios — missing certificate, port conflict, invalid credentials in `certs/test_https.sh`
- [x] T026 Run full end-to-end validation per `specs/009-enable-https/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3, P1)**: Depends on Foundational completion
- **User Story 2 (Phase 4, P2)**: Depends on Foundational completion
- **User Story 3 (Phase 5, P3)**: Depends on Foundational completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run in parallel with US1)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories (can run in parallel with US1 and US2)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Test tasks marked [P] can run in parallel within the same story
- Implementation tasks follow dependency order
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 3 (US1)**: T007 and T008 test tasks can run in parallel
- **Phase 4 (US2)**: T013 and T014 test tasks can run in parallel
- **Phase 5 (US3)**: T019, T020, T021 test tasks can all run in parallel
- **Phase 6**: T024, T025 can run in parallel
- All three user stories (US1, US2, US3) can be worked on in parallel after Foundational phase

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Test certificate CN and SAN validation in certs/test_https.sh"
Task: "Test frontend HTTPS connectivity — curl -k https://kilo.clinic.com.hk:3001/login"

# Launch all implementation for User Story 1 together (after tests fail):
Task: "Create Next.js HTTPS dev server at apps/web/server.js"
Task: "Update apps/web/package.json dev script to node server.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (certs/ directory, openssl config, generate script)
2. Complete Phase 2: Foundational (generate certificate, verify properties)
3. Complete Phase 3: User Story 1 (frontend HTTPS, tests, error handling)
4. **STOP and VALIDATE**: Test that `https://kilo.clinic.com.hk:3001/login` loads

### Incremental Delivery

1. Complete Setup + Foundational → Certificate ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Frontend HTTPS)
   - Developer B: User Story 2 (Backend HTTPS)
   - Developer C: User Story 3 (Certificate validation + documentation)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests are included per user request ("create test cases and add error handling")
- Error handling is integrated into implementation tasks (T003, T012, T017, T018, T025)
- Each user story should be independently completable and testable
- All test tasks use `certs/test_https.sh` as the shared test harness
- Verify tests fail before implementing each user story
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Implementation notes**: `runserver_plus` requires `Werkzeug` + `pyOpenSSL` (not auto-installed by `django-extensions`). Do NOT use `--noreload` with SSL mode (causes `WERKZEUG_SERVER_FD` KeyError). `allowedDevOrigins` needs bare hostname `kilo.clinic.com.hk` (no port) for HMR.
