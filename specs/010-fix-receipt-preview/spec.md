# Feature Specification: Fix Receipt Preview 500

**Feature Branch**: `010-fix-receipt-preview`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "already have 'Receipt' module, but after changed clinic host to vps.tailb5775.ts.net, it doesn't work. error: https://vps.tailb5775.ts.net/doctor/patients/[id]/receipt — Receipt Preview — Request failed with status code 500. help to fix"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Doctor views Receipt Preview without error (Priority: P1)

A doctor opens a patient's Receipt tab, and the Receipt Preview (the existing receipt record with PDF preview) loads successfully instead of failing with HTTP 500. This restores the Receipt module to its pre-host-change working state under the current clinic host.

**Why this priority**: P1 — The Receipt module is a core doctor workflow (issuing and previewing patient receipts). It worked before the host change and is now completely broken, blocking doctors from issuing or previewing receipts. Restoring it is the entire point of this feature.

**Independent Test**: Open the Receipt tab for any patient at the current clinic host and confirm the receipt list and preview load without an error; creating a receipt and downloading its PDF also succeeds.

**Acceptance Scenarios**:

1. **Given** the clinic is served at `vps.tailb5775.ts.net`, **When** a doctor opens `/doctor/patients/{id}/receipt`, **Then** the Receipt Preview area loads successfully with no error message.
2. **Given** a doctor creates a receipt, **When** the receipt saves, **Then** the receipt appears in the list and its PDF preview downloads/renders without a 500 error.
3. **Given** the receipt preview fails for any reason, **When** the error occurs, **Then** the user sees a clear, actionable error message rather than a raw "Request failed with status code 500".

---

### User Story 2 - Existing receipts remain previewable after host change (Priority: P2)

Receipts created before the host change should still preview and verify correctly; the module should not depend on the retired host name.

**Why this priority**: P2 — Existing receipt records and their PDFs/QR links are patient-facing (some may already be in patients' hands via QR). They must keep working under the new host.

**Independent Test**: Verify an existing receipt's preview and QR verification link resolves to a page served by the current host.

**Acceptance Scenarios**:

1. **Given** a receipt created before the host change, **When** a doctor opens its preview, **Then** the PDF renders successfully.
2. **Given** a receipt QR code, **When** scanned, **Then** it opens the verification page at the current host and reports the receipt status.

---

### Edge Cases

- Receipt preview when the backend service is temporarily unavailable — user should get a clear retryable error, not a raw 500.
- Receipt preview for a patient with no receipts — the list should show an empty state, not an error.
- A receipt whose PDF template or asset path refers to the old host — must resolve under the current host (or be re-issued without error).
- Concurrent preview of the same receipt by two doctors — both should succeed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Receipt Preview area on `/doctor/patients/{id}/receipt` MUST load successfully when the clinic is served at the current host.
- **FR-002**: The system MUST resolve any internal references to the clinic host from the old host to the current host so no request targets the retired address.
- **FR-003**: The system MUST return the receipt PDF for a "download/preview" action as a successful response.
- **FR-004**: When a preview/PDF request fails, the system MUST return a user-friendly error message instead of a generic 500 shown to the doctor.
- **FR-005**: Receipts created before the host change MUST remain previewable and verifiable.
- **FR-006**: The system MUST keep working when no hardcoded clinic host is assumed anywhere in the receipt preview path — the effective host must be the current configured clinic host.

### Key Entities *(include if feature involves data)*

- **Receipt**: Clinic financial record per patient visit (fields: rref, date, patient, doctor info, fees breakdown, total, diagnosis, status). Each receipt has a PDF preview and a QR verification token.
- **Patient**: The patient a receipt belongs to; previews are scoped by patient on the patient dashboard.
- **Receipt PDF Preview**: On-demand rendered PDF of a receipt record, linked from the Receipt tab.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of receipt preview requests from the Receipt tab succeed (no HTTP 500) when the clinic host is the current one.
- **SC-002**: A doctor can create a receipt and open its PDF preview in under 5 seconds total.
- **SC-003**: 100% of pre-existing receipts (created before the host change) preview and verify without error.
- **SC-004**: No request from the Receipt module resolves to the retired host (verified across the module's pages and generated links).

## Assumptions

- The failure is caused by the clinic host change (the module worked before; the error is a server-side 500, not a client-side routing problem).
- The current clinic host is `vps.tailb5775.ts.net`, and the backend serves under the same public origin via the existing proxy layout.
- The fix should not change how receipts are issued, stored, or verified — only restore correct operation under the current host.
- Existing receipt data and QR tokens are valid and must not be regenerated or invalidated.
- The doctor-role access model for the Receipt tab remains unchanged.