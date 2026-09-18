# Implementation Plan: Fix Receipt Preview 500

**Branch**: `010-fix-receipt-preview` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-fix-receipt-preview/spec.md`

## Summary

The Receipt Preview modal 500s because the backend PDF generator imports the `fitz` (PyMuPDF) module, which is **not installed** in the backend environment and **not declared** in `backend/requirements.txt`. The root cause was confirmed by reproduction:

```
File "backend/api/utils.py", line 227, in generate_receipt_pdf_from_template
    import fitz
ModuleNotFoundError: No module named 'fitz'
```

The 500 is **not** a host-specific failure — the host change surfaced it only because the backend was redeployed into a fresh/different environment (`vps.tailb5775.ts.net`) that never had PyMuPDF installed. `backend/api/receipts/views.py` `pdf` action catches all exceptions and returns HTTP 500 with the raw error string.

A secondary host-related latent issue exists: `generate_receipt_pdf_from_template` builds the QR verification URL from `base_url` (passed as `settings.FRONTEND_BASE_URL`, default `http://localhost:3001`), so the QR embedded in every new PDF currently points at `localhost` on the deployed host. This must be corrected to the public host (`vps.tailb5775.ts.net`) at the same time — otherwise receipt PDFs render but their QR verification links are broken.

The certificate path (`backend/api/utils.py:117`, `fitz.open` in `generate_certificate_pdf_from_template`) shares the same missing dependency.

**Scope decision (from clarify Q1, unanswered → documented assumption)**: fix scoped to the PDF-preview path (the reported 500). The receipt list/create paths use no `fitz` and showed no failure. Existing QR tokens/records are untouched; the certificate module inherits the dependency fix but no certificate-specific changes are planned.

> **Implemented 2026-09-18**: `PyMuPDF>=1.24,<2` and `Pillow>=10` declared/installed (the regression test surfaced Pillow as a second missing dep); structured error handling added to both receipt and certificate `pdf` actions; frontend hook now decodes and shows detailed backend errors; `FRONTEND_BASE_URL` set for the public host. Live endpoint verified 200 `application/pdf`; all 13 backend tests + `tsc` pass.

## Technical Context

**Language/Version**: Python 3.12 (backend, venv at `backend/venv`), TypeScript/React 19 + Next.js 16.2 (frontend)

**Primary Dependencies**: Django 6.0.6, DRF, PyMuPDF (`fitz`) — missing, must be added; `qrcode`, `reportlab` (already present via `requirements.txt` for certificate QR)

**Storage**: SQLite (`backend/db.sqlite3`) — receipt records already persist; no schema change

**Testing**: `pytest` (backend, existing `backend/api/tests.py`, `backend/api/rag/tests.py`); `npx tsc --noEmit` + eslint (frontend)

**Target Platform**: Linux VPS behind Tailscale funnel, `vps.tailb5775.ts.net` → Next.js `:3001` → `/api/*` proxy → Django `:8000`

**Project Type**: Web application (monorepo: `apps/web` Next.js frontend + `backend` Django REST API)

**Performance Goals**: Receipt PDF preview renders within 5 seconds (spec SC-002); PyMuPDF opens template + fills fields in <1s — the current bottleneck is the missing import, not rendering

**Constraints**: No schema/migration work; no frontend changes expected (the UI already calls `GET /receipts/{id}/pdf/` and renders the returned PDF as data URL); must not invalidate existing QR tokens

**Scale/Scope**: Single clinic; receipt volume small (hundreds); trivial load

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repo's `.specify/memory/constitution.md` is an unfilled template (placeholder sections with `[PRINCIPLE_NAME]` markers). No enforceable gate, principle, or test-first mandate is defined. Gates therefore reduce to the qualitative quality bar mirrored in the repo's AGENTS.md (ponytail): root-cause fixes, minimal diffs, one shared guard rather than per-caller patches, and a runnable check left behind.

- **GATE 1 (YAGNI / minimal diff)**: The fix is a dependency declaration + environment install + one base-URL correction. No new abstractions. **PASS**
- **GATE 2 (root cause, not symptom)**: Fix `requirements.txt` + installed env once, fixing both receipt and certificate `fitz` paths — not a per-caller try/except. **PASS**
- **GATE 3 (leave a check)**: Add a regression test for the PDF endpoint (or dependency import) so CI fails if `fitz` unmounts again. **PASS**

*Re-check after Phase 1: PASS (design adds no new complexity).*

## Project Structure

### Documentation (this feature)

```text
specs/010-fix-receipt-preview/
├── plan.md              # This file
├── research.md          # Phase 0: root-cause confirmation + host/base-url findings
├── data-model.md        # Phase 1: no data-model change (documented)
├── quickstart.md        # Phase 1: validation guide
├── contracts/           # Phase 1: PDF endpoint contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
backend/
├── requirements.txt     # ADD PyMuPDF pin (receipt + certificate PDF both need it)
├── api/
│   ├── utils.py         # generate_receipt_pdf_from_template / generate_certificate_pdf_from_template (base_url wiring)
│   ├── receipts/
│   │   └── views.py     # pdf action passes settings.FRONTEND_BASE_URL -> needs the corrected base URL
│   └── tests.py         # ADD regression test for /receipts/{id}/pdf/
apps/web/                # NO changes required (UI already renders PDF from data URL)
```

**Structure Decision**: Single backend change set — dependency (root), environment install, base-URL source (`settings` default and/or `.env`), and one API test. Frontend untouched.

## Complexity Tracking

N/A — no constitution violations; the change is a dependency + config-level fix with one regression test. `fitz` install cost is dominated by the wheel download, not runtime complexity.