# Contract: Receipt PDF Preview Download

The Receipt Preview modal (frontend) and the Django backend contract that currently 500s and must be restored to 200.

## Endpoint

**`GET /api/receipts/{id}/pdf/`** (DRF ViewSet action on `ReceiptViewSet`, route prefix `receipts` registered in `backend/api/urls.py`; frontend reaches it as `/receipts/{id}/pdf/` through the `/api/*` proxy).

## Request

| Field | Value |
|---|---|
| Method | `GET` |
| Path | `/receipts/{id}/pdf/` where `{id}` = receipt primary key (UUID) |
| Auth | Doctor-role token (`Authorization: Token <token>` or Bearer JWT) |
| Query params | none |
| Body | none |

## Success Response — 200 OK

| Field | Value |
|---|---|
| Content-Type | `application/pdf` |
| Body | Raw PDF bytes (filled template `template/receipt-f1.pdf` with field values + QR image overlay) |
| Headers | `Content-Disposition: attachment; filename="receipt-{id}.pdf"` |

Frontend expectation (`useReceiptPreview.ts`): fetched with `responseType: "arraybuffer"`; bytes are base64-encoded into `data:application/pdf;base64,...` and rendered in the modal.

## Failure Response — must not be a bare 500

| Status | Condition | Body shape |
|---|---|---|
| 400 | Revoked receipt re-revoke | `{"error": "Receipt is not active"}` |
| 404 | Receipt not found | DRF default 404 |
| 500 | **Current broken state** — `import fitz` → `ModuleNotFoundError` | `{"error": "No module named 'fitz'"}` |

**Contract requirement (FR-003/FR-004)**: after the fix, this endpoint returns **200** for an existing active receipt and the UI shows the PDF; unexpected failures return a user-meaningful message, not the raw `ModuleNotFoundError`.

## Verification Endpoint (secondary, host-corrected by this fix)

**`GET /verify-receipt/{token}/`** (weightless public endpoint, `VerifyReceiptView`, `AllowAny`):
- 200 with `{"verified": true, ...}` for a valid, un-expired, un-revoked token;
- 200 with `{"verified": false, "message": "..."}` for invalid/revoked/fake tokens;
- The token value in each receipt PDF's QR encodes `{base_url}/verify-receipt/{token}/` — `base_url` must be the public host after the fix.