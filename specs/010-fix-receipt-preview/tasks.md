---

description: "Task list for Fix Receipt Preview 500 implementation"
---

# Tasks: Fix Receipt Preview 500

**Input**: Design documents from `/specs/010-fix-receipt-preview/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: One regression test included for the reported 500 — this is the runnable check the plan commits to (prevents the missing-dependency failure from silently returning). No full test suite requested by the spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Web app: backend code at repo root `backend/`, frontend at `apps/web/`
- No frontend changes required for this feature (UI already renders the PDF once the endpoint returns 200)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the backend environment for the dependency fix

- [X] T001 [P] Install PyMuPDF into the backend venv: `backend/venv/bin/pip install "PyMuPDF>=1.24,<2"` (import name `fitz`)
- [X] T002 [P] Confirm the receipt template exists at `template/receipt-f1.pdf` (used by `backend/api/utils.py` `generate_receipt_pdf_from_template`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Declare the missing dependency so installs are reproducible (root cause, NOT a per-caller patch)

**⚠️ CRITICAL**: No user story can be fully verified until this phase is complete

- [X] T003 Add `PyMuPDF>=1.24,<2` to `backend/requirements.txt` (both `generate_receipt_pdf_from_template` at `backend/api/utils.py:227` and `generate_certificate_pdf_from_template` at `backend/api/utils.py:117` import `fitz` — one declaration fixes both)

**Checkpoint**: Foundation ready — `pip install -r backend/requirements.txt` now yields a working `fitz` import.

---

## Phase 3: User Story 1 - Doctor views Receipt Preview without error (Priority: P1) 🎯 MVP

**Goal**: `GET /api/receipts/{id}/pdf/` returns 200 with a valid PDF instead of 500, and unexpected failures no longer leak raw module errors to the doctor.

**Independent Test**: Open `/doctor/patients/{id}/receipt`, click **Receipt Preview** on an existing receipt → modal shows the PDF, no "Request failed with status code 500".

### Test for User Story 1 (regression guard)

> **NOTE: Write this test FIRST, ensure it FAILS before implementation** (it fails today with `No module named 'fitz'`)

- [X] T004 [US1] Regression test in `backend/api/tests.py`: with the test doctor's token, `GET /api/receipts/{id}/pdf/` (existing active receipt) returns **200** with `content-type` `application/pdf`; assert `b"%PDF"` prefix in response body

### Implementation for User Story 1

- [X] T005 [US1] Sanitize the failure payload in `backend/api/receipts/views.py` `pdf` action (currently `return Response({'error': str(e)}, status=500)`): keep server-side `traceback.print_exc()`, but return a generic user-facing message (e.g. `"Receipt PDF generation failed. Please try again."`) so the UI never shows `No module named 'fitz'` (FR-004)
- [X] T006 [P] [US1] Re-install runtime deps and restart the backend so the running venv picks up the new `fitz` module (e.g. `bash start-all.sh restart` after `T001`/`T003`)

**Checkpoint**: Receipt Preview modal renders the PDF for existing receipts — User Story 1 is fully functional on its own.

---

## Phase 4: User Story 2 - Existing receipts remain previewable & verify at the public host (Priority: P2)

**Goal**: Receipt preview still works, and the QR verification URL embedded in newly generated PDFs points at the public host (`https://vps.tailb5775.ts.net`), not `localhost` (research decision; spec SC-003/SC-004).

**Independent Test**: Regenerate a receipt PDF and confirm its embedded QR/URI contains the public host; scan the QR → opens `https://vps.tailb5775.ts.net/verify-receipt/<token>/`, not `localhost`.

### Implementation for User Story 2

- [X] T007 [US2] Set `FRONTEND_BASE_URL=https://vps.tailb5775.ts.net` in `backend/.env` (consumed by `backend/config/settings.py` line 92; passed as `base_url` into `generate_receipt_pdf_from_template`, which builds `verify_url = f"{base_url}/verify-receipt/{receipt.qr_code_token}/"` at `backend/api/utils.py` `generate_receipt_pdf_from_template`)
- [X] T008 [P] [US2] Verify the public verification page resolves at `https://vps.tailb5775.ts.net/verify-receipt/<token>/` (`VerifyReceiptView` in `backend/api/receipts/views.py`, registered in `backend/api/urls.py`) for an existing active receipt — returns `{"verified": true, ...}`

**Checkpoint**: Existing receipts preview AND their QR verification links work under the public host.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Prove the fix end-to-end and close out documentation

- [X] T009 [P] Run all validation scenarios in `specs/010-fix-receipt-preview/quickstart.md` (VS-1 PDF 200, VS-2 UI modal, VS-3 QR host, VS-4 certificate PDF still works) and record results in the spec checklist
- [X] T010 [P] Update `specs/010-fix-receipt-preview/plan.md`/`research.md` status notes with the actual deployed fixes if any deviation occurred during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — the real root-cause fix (requirements declaration)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs `fitz` installed + declared)
- **User Story 2 (Phase 4)**: Runs independently of US1 (env config only), can start after Phase 2
- **Polish (Phase 5)**: Depends on US1 (and US2 for VS-3)

### User Story Dependencies

- **User Story 1 (P1)**: Requires Phase 2 (`fitz` present). Independent of US2.
- **User Story 2 (P2)**: Requires frontend proxy reachable; independent of US1 code but shares the `fitz`-based PDF path for verification.

### Within User Story 1

- Regression test (T004) written first and failing → then implementation (T005/T006)

### Parallel Opportunities

- T001 ∥ T002 (Phase 1)
- T005 ∥ T006 (within US1, once T004 drafted)
- US1 (Phase 3) and US2 (Phase 4) can proceed in parallel after Phase 2 (different files: `views.py`+`tests.py` vs `.env`)
- T009 ∥ T010 (Polish)

---

## Parallel Example: Fanned-out implementation

```text
Worker A (Phase 2 + US1):
  Task: "Add PyMuPDF>=1.24,<2 to backend/requirements.txt"
  Task: "Add regression test for /api/receipts/{id}/pdf/ in backend/api/tests.py"
  Task: "Sanitize 500 payload in backend/api/receipts/views.py pdf action"

Worker B (US2, after Phase 2):
  Task: "Set FRONTEND_BASE_URL=https://vps.tailb5775.ts.net in backend/.env"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (install `fitz` into venv)
2. Complete Phase 2 (declare `PyMuPDF` in `requirements.txt`)
3. Write regression test T004 first (fails with current 500) → implement T005/T006
4. **STOP and VALIDATE**: Receipt Preview modal renders — MVP done

### Incremental Delivery

1. Phase 1 + 2 → `fitz` available and reproducible
2. US1 → 200 PDF + clean error handling (MVP)
3. US2 → QR/host correctness for new PDFs
4. Polish → quickstart validation across receipt + certificate modules

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing (T004 must fail pre-fix)
- Commit after each task or logical group
- No data migration, no frontend change, no new model — this is a dependency + config + error-handling fix