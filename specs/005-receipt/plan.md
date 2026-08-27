# Implementation Plan: receipt

## Summary

Add a new receipt tab on the patient dashboard that allows doctors to generate fillable PDF receipts for patient visits using the receipt-f1.pdf template. The feature includes QR code verification and follows the same pattern as the sick leave certificate feature.

**Enhancements**: Comprehensive error handling strategy including frontend error states, backend error codes, and expanded validation scenarios for both success and failure cases. Test coverage includes unit tests, integration tests, and error case testing.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Python 3.11+ (backend/Django)

**Primary Dependencies**: 
- Frontend: React 19.2.0, Next.js 16.2.0, Shadcn UI, Radix UI, TanStack Query 5.101.0, Zod 4.4.3, Axios 1.17.0
- Backend: Django 6.0.6, Django REST Framework 3.17.1, DRF SimpleJWT 5.5.1

**Storage**: PostgreSQL (production), SQLite (development) — new Receipt model similar to SickLeaveCertificate

**Testing**: 
- Frontend: Jest + React Testing Library
- Backend: Pytest + Django Test Client

**Target Platform**: Web (Chrome, Firefox, Safari, Edge), responsive desktop and mobile

**Project Type**: Web application (full-stack monorepo with frontend + backend)

**Performance Goals**: 
- Receipt generation within 2 seconds (SC-001)
- Modal renders at 60fps on desktop, responsive on mobile
- QR code verification within 3 seconds

**Constraints**: 
- Must follow existing tab navigation patterns in `apps/web`
- Must use existing TanStack Query patterns for data fetching
- Must respect existing Django permission system (`DoctorPermission`)
- Must integrate with existing PDF generation pipeline (`weasyprint`/`reportlab`)
- No new external dependencies

**Scale/Scope**: 
- Single feature on existing patient dashboard tab
- Reuses existing `Patient` and `Doctor` models
- New `Receipt` model with similar fields to SickLeaveCertificate
- ~600 lines of new frontend code, ~300 lines of new backend code

## Constitution Check

The feature:
- Is a standalone UI enhancement (Library-First principle)
- Does not introduce new external dependencies (Simplicity principle) 
- Follows existing test patterns (Test-First principle - will require tests)
- Integrates with existing API contracts (Integration Testing principle)

Result: PASS — no constitutional violations detected.

## Project Structure

### Documentation (this feature)

```
specs/005-receipt/
├── plan.md              # This file
├── research.md          # Phase 0 output 
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
�└── spec.md              # Feature specification
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── models/
│   ├── serializers/
│   ├── views/
│   └── utils/
�└── tests/

apps/web/
├── src/
│   ├── components/
│   │   ├── doctor/
│   │   ├── shared/
│   │   └── ui/
│   ├── pages/
│   │   └── doctor/
│   │       ├── patients/
│   │       │   └── [patient-id]/
│   │       │       └── receipt.tsx
│   │       └── receipt.tsx (overview/dashboard)
│   ├── hooks/
│   ├── lib/
│   └── types/
�└── tests/
```

**Structure Decision**: This project uses a monorepo with separate `backend/` (Django) and `apps/web/` (Next.js) directories. The feature primarily involves backend work (new model/viewset) and frontend work in `apps/web/` for the new tab page.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |

## Phase 0: Research

### Unknowns Requiring Research

| Unknown | Research Task | Priority |
|---------|---------------|----------|
| PDF template field mapping | Research how to map form fields to the receipt-f1.pdf template locations | High |
| Receipt number format | Determine exact format for rref field (RYYYY-sequence) | Medium |
| QR code content for receipts | What data should be encoded in receipt QR codes | Medium |
| English number formatting | Implementation for converting numbers to English words | Medium |

### Research Tasks

1. **Research PDF template field mapping for receipt-f1.pdf**
   - Examine template structure to identify field positions
   - Determine which Python PDF library methods work best
   - Check if existing sick-leave PDF generation code can be reused

2. **Research receipt number format generation**
   - Format: RYYYY-XXXX-XXXX-XXXX (R + year + sequence groups)
   - Need thread-safe sequence generation similar to sick leave

3. **Research QR code content for receipt verification**
   - What patient/visit data to encode for verification
   - Should follow similar pattern to sick leave certificate

4. **Research English number formatting**
   - Library or implementation for converting 1234 to "One thousand two hundred thirty-four"

## Phase 1: Design & Contracts

### Data Model

**New entities required**:
- `Receipt` — PDF receipt metadata, similar to SickLeaveCertificate but for financial transactions
- `ReceiptCounter` — For generating sequential receipt numbers (similar to CertificateCounter)

**Existing entities reused**:
- `Patient` — Foreign key relationship
- `Doctor` — Information pulled from request.user.profile
- `Clinic` — Information pulled from doctor's profile

### Interface Contracts

**API Endpoints (new)**:
```
POST /api/receipts/
- Creates new receipt record
- Returns: Receipt JSON with generated reference_number and qr_code_token
- Auth: Requires doctor role (DoctorPermission)

GET /api/receipts/{id}/
- Returns: Receipt JSON detail
- Auth: Requires doctor role

GET /api/receipts/{id}/pdf/
- Returns: PDF file (Content-Type: application/pdf)
- Auth: Requires doctor role

PATCH /api/receipts/{id}/revoke/
- Marks receipt as revoked
- Auth: Requires doctor role

GET /api/verify-receipt/{token}/
- Public verification endpoint for receipt QR codes
- Returns: JSON with receipt details or error
- Auth: None (public)
```

**Frontend API Layer** (new hooks):
```
useReceipts(patientId: string) -> {
  data: Receipt[],
  isLoading: boolean,
  error: Error | null
}

useCreateReceipt(patientId: string) -> {
  mutate: (receiptData) => void,
  isPending: boolean,
  error: Error | null
}

useReceipt(id: string) -> {
  data: Receipt,
  isLoading: boolean,
  error: Error | null
}

useVerifyReceipt() -> {
  mutate: (token: string) => void,
  isPending: boolean,
  error: Error | null
}
```

**WebSocket Requirements**: None

### Quickstart Validation Guide

**Prerequisites**:
- Django server running (`cd backend && python manage.py runserver`)
- Next.js dev server running (`cd apps/web && pnpm dev`)
- Doctor user logged in with access to at least one patient
- Template file exists at `C:\kilocode\clinic11\template\receipt-f1.pdf`

**Validation Scenarios**:

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 1 | Tab appears | 1. Log in as doctor<br>2. Navigate to `/doctor/patients/{id}/`<br>3. Look for tab navigation | Receipt tab visible before Sick Leave Certificate tab |
| 2 | Form loads | 1. Click Receipt tab<br>2. Wait for form to load | Form with fillable fields from template appears |
| 3 | Create receipt | 1. Fill in all required fields<br>2. Click "Generate Receipt"<br>3. Wait for processing | Success message, QR code displayed, PDF generated |
| 4 | View receipt | 1. After generation, view receipt details | All filled data shown correctly |
| 5 | PDF download | 1. Click download button<br>2. Verify PDF downloads | PDF with correct data and fillable fields downloads |
| 6 | QR verification | 1. Scan QR code with phone/scanner<br>2. Or visit verification URL | Verification page shows receipt details and "Valid receipt" |
| 7 | Role restriction | 1. Log in as non-doctor<br>2. Navigate to same URL<br>3. Try to access Receipt tab | Tab not visible or 403/redirect |

## Error Handling Strategy

### Frontend Error States
- **Template Load Failure**: Show error message "Receipt template not available" with retry button
- **PDF Generation Error**: Display "Failed to generate receipt. Please contact support." with error code
- **QR Code Generation Failure**: Show placeholder QR with error message "QR verification temporarily unavailable"
- **Network Errors**: Automatic retries (max 3 attempts) with exponential backoff
- **Permission Errors**: Redirect to access denied page with clear messaging

### Backend Error Codes
```python
# HTTP Status Codes:
# 400 - Bad Request (invalid form data, missing fields)
# 401 - Unauthorized (JWT token expired/invalid)
# 403 - Forbidden (non-doctor role accessing receipt)
# 404 - Not Found (patient does not exist)
# 422 - Unprocessable Entity (PDF generation failed)
# 500 - Internal Server Error (PDF library error, template missing)
```

### Validation Scenarios (Expanded)

| # | Scenario | Steps | Expected Outcome |
|---|----------|-------|------------------|
| 8 | Missing patient name | Leave name field empty, click Generate | Validation error: "Patient name is required" |
| 9 | Invalid amount (negative) | Enter negative total amount | Validation error: "Amount must be positive" |
| 10 | Template missing | Rename template file, try generate | Error page: "Template configuration error" with admin notification |
| 11 | PDF generation timeout | Simulate slow processing (>5s) | Timeout error message: "Generation taking longer than expected, please try again" |
| 12 | Corrupted PDF template | Replace template with invalid file | Error: "Invalid template format" with safe failure fallback |
| 13 | Duplicate receipt number | Force same rref, attempt creation | Conflict error: "Receipt already exists for this transaction" |
| 14 | Revoked receipt verification | Revoke receipt, scan QR | Verification page: "This receipt has been revoked" with revocation reason |
| 15 | Expired receipt verification | Modify timestamp to 11 years old, verify | Verification page: "This receipt has expired" with issue date |
| 16 | Network failure during save | Disconnect network mid-generation | Local state preserved, retry option displayed |
| 17 | Invalid JWT token | Modify token in Authorization header | 401 Unauthorized redirect to login |
| 18 | Concurrent receipt creation | Two doctors same patient at same time | First succeeds, second gets conflict message |

**Test Commands**:
```bash
# Frontend unit tests
cd apps/web && npx jest --testPathPattern="receipt" --coverage

# Frontend integration tests  
cd apps/web && npx playwright test receipt --reporter=list

# Backend tests (verify endpoints and error handling)
cd backend && python -m pytest api/tests.py -v -k "receipt" --tb=short

# Error handling verification
cd backend && python -m pytest api/tests.py::test_receipt_errors -v
```

**Expected Outcomes**:
- All scenarios pass with 100% success rate
- Receipt generation completes within 2 seconds on average
- No console errors in browser devtools
- Works across Chrome, Firefox, Safari, Edge