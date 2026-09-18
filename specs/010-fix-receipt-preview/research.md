# Research: Fix Receipt Preview 500

## Decision: Root Cause Confirmed — Missing `fitz` (PyMuPDF) Dependency

**Rationale**: Reproduced the exact failure locally against `backend/venv`:

```
File "/home/ubuntu/kilocode/clinic12/backend/api/utils.py", line 227, in generate_receipt_pdf_from_template
    import fitz
ModuleNotFoundError: No module named 'fitz'
```

`backend/api/receipts/views.py` `pdf` action wraps PDF generation in `try/except` and returns `{'error': str(e)}`, status=500 on any exception — so the missing module surfaces as the user-visible "Request failed with status code 500" in the Receipt Preview modal. `fitz` is neither in `backend/requirements.txt` nor installed in the venv. The host change appeared causal only because the backend moved to an environment without the wheel; the pure code path has no host-hardcoding in the 500 trigger.

**Alternatives considered**:
1. Replace PyMuPDF with another library (e.g., pdfrw/PyPDF2) — rejected: template fill + widget update + image overlay already work with `fitz`; porting both receipt and certificate generators is a much larger diff with no functional gain.
2. Per-caller try/except to prettify the 500 — rejected: treats the symptom, not the cause; the certificate path (utils.py:117) has the identical missing import.

## Decision: QR Base URL Must Point to Public Host

**Rationale**: `generate_receipt_pdf_from_template(receipt, base_url)` builds:
`verify_url = f"{base_url}/verify-receipt/{receipt.qr_code_token}/"` and encodes it into the PDF's QR image. The view passes `base_url=settings.FRONTEND_BASE_URL`, whose default is `http://localhost:3001`. On the deployed host the QR would encode `localhost` — a broken verification link. `settings.FRONTEND_BASE_URL` must be set (e.g., `.env` → `FRONTEND_BASE_URL=https://vps.tailb5775.ts.net`) so newly generated PDFs embed a functional verification URL. (Existing prints are unaffected — this only changes what future PDFs embed; existing QR tokens stay valid, per spec assumption.)

**Alternatives considered**:
1. Derive host from the incoming request's `Host` header — rejected: the request passes through the Next.js proxy, so the backend sees `localhost:8000`-style host, not the public origin; the configured env var is the reliable source.
2. Keep `localhost` default — rejected: produces broken QR on deployment; contradicts spec SC-004 (no requests to wrong host).

## Decision: Dependency Pin

**Rationale**: `PyMuPDF` (import name `fitz`) latest at planning time is `1.28.2`; wheels exist for Python 3.12 on x86_64 Linux. Pin a stable major (`PyMuPDF>=1.24,<2`) in `requirements.txt` to allow patch updates while avoiding a hypothetical 2.x breaking the `fitz` import surface. Both receipt (line 227) and certificate (line 117) code paths rely on `fitz.open` + `page.widgets()`/`page.get_images()` — stable API across 1.24–1.28.

**Alternatives considered**: minimal unpinned `PyMuPDF` — rejected for reproducibility (CI installs from `requirements.txt`).

## Integration Notes

- Receipt list/create: independent of `fitz` — unaffected (clarify Q1 assumption: scope = preview path).
- Frontend: `useReceiptPreview.ts` fetches `GET /receipts/{id}/pdf/` with `responseType: arraybuffer`, converts to a data URL, and renders in the modal — no frontend change needed once the endpoint returns 200.
- CI (`ci.yml`) already runs `pip install -r backend/requirements.txt` — adding the pin installs `fitz` in CI automatically; the new regression test then exercises it.

## Post-Implementation Notes (2026-09-18)

- **Second missing dependency found via the regression test**: `Pillow` (`PIL`) is required by `qrcode` to render the QR image inside the PDF. Added `Pillow>=10` to `backend/requirements.txt` and installed into the venv — the test-first regression guard caught this before it could 500 in production.
- **Error handling implemented more thoroughly than the original plan**: both the receipt `pdf` action (`backend/api/receipts/views.py`) and the sibling certificate `pdf` action (`backend/api/views.py`) now log a structured `logger.error` (record id, rref, error type, `exc_info` traceback) server-side and return a safe JSON payload `{error, error_type, <record>_id}` instead of leaking raw module errors. The frontend `useReceiptPreview.ts` decodes the ArrayBuffer error body and surfaces the detailed message in the modal (with Retry).
- **QR host confirmed**: live backend process exports `FRONTEND_BASE_URL=https://vps.tailb5775.ts.net`; generated PDFs embed public-host verify URLs (VS-3 pass). `.env` documents it for direct runs.
- **VS-4 (certificate) caveat**: no real certificates exist in the DB (404), so validation used a function-level generation check with a fully populated record — valid `%PDF` output. The earlier `TypeError: unsupported operand type(s) for +` seen in a bare unit-constructed certificate is a test-construction artifact (missing `issue_date`/`expiry_date`), not a regression.