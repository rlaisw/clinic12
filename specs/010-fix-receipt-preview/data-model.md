# Data Model: Fix Receipt Preview 500

## Decision: No Data Model Changes

This feature is an operational dependency/config fix. The `Receipt` entity, its fields, relationships, and persistence are unchanged — existing receipts (including QR tokens) must remain intact per spec assumptions.

## Existing Entities (context, unchanged)

### Receipt
- **Represents**: A financial receipt for a patient visit, issued by a doctor.
- **Key attributes** (unchanged): `id`, `rref` (unique receipt reference), `patient` (FK → Patient), `patient_name`, `patient_hkid`, `doctor_name`, `doctor_email`, `doctor_phone`, `clinic_name`, `clinic_address`, `date`, fee fields (`consultation_free`, `medications_free`, `investigations_free`, `procedures_free`, `misc_free`, `total_free`), `total_dollars` (English words), `diagnosis`, `qr_code_token` (unique), `status` (active/revoked), `revoked_timestamp`.
- **Relationships**: Many-to-one → `Patient`; one receipt ↔ one derived PDF (generated on demand) ↔ one QR code containing the verification URL.

### Patient
- **Represents**: Clinic patient; receipts are scoped by `patient_id`.
- **Relationship**: One-to-many → Receipt.

## Validation Rules (existing, unchanged)
- `rref` unique per receipt; `qr_code_token` unique (used for verification lookup).
- `status` transitions: `active` → `revoked` (revoke action; revoked receipts return 400 on re-revoke).
- Financial fields coerced to `float` for PDF rendering.

## State Transitions
- PDF generation is a stateless, on-demand operation over an existing Receipt — no state change. The only observable transition is the HTTP response: 500 (current, broken) → 200 PDF (after fix).

## Derived Artifacts
- **Receipt PDF**: generated at request time from `template/receipt-f1.pdf` (fillable PDF template). Not persisted as a file; returned as bytes.
- **QR verification URL**: `{base_url}/verify-receipt/{qr_code_token}/` — embeds the clinic host; this is the value corrected by the fix (host sourced from `FRONTEND_BASE_URL`).