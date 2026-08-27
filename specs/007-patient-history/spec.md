# Feature Specification: Patient Visit Summary

## Purpose
A comprehensive patient visit summary feature that integrates both medical (sick leave certificate) and financial (receipt) elements into a single unified view for doctors and patients.

## Features

### 1. Medical Documentation (Sick Leave Integration)
- Generate sick leave certificates with unique SREF (Sick Leave Reference)
- Include QR code verification for certificate authenticity
- Support certificate lifecycle: active → revoked → expired
- Auto-populate patient data from existing records

### 2. Financial Documentation (Receipt Integration)
- Generate itemized receipts for patient visits
- Include QR code linking to receipt details
- Support payment tracking and status
- Link receipts to specific patient visits

### 3. Unified Patient Visit Summary
- Combine medical and financial data for single patient visit
- Display both certificate and receipt information side-by-side
- Provide export options (PDF, print, share)
- Support search and filtering by date, patient, or visit type

### 4. User Roles & Permissions
- **Doctors**: Can issue certificates, generate receipts, revoke certificates, verify QR codes
- **Patients**: Can view their own certificates and receipts, verify QR codes, download/share
- **Clinic Staff**: Can search all certificates/receipts, manage revocation, view audit logs

## User Flows

### Flow 1: Issue Certificate + Generate Receipt
1. Doctor opens patient page → clicks "Visit Summary" tab
2. System displays: Sick Leave Certificate section + Receipt section
3. Doctor issues sick leave certificate → SREF generated + QR code displayed
4. Doctor generates receipt → itemized amounts calculated + QR code displayed
5. Both documents link to same patient-visit-date combination

### Flow 2: Verify & Validate
1. Doctor or patient scans QR code (either certificate or receipt)
2. System validates authenticity and displays status
3. Show: "Verified", "Revoked", "Expired", or "Fake"
4. Display associated patient and visit details

### Flow 3: Search & Audit
1. Search by patient name, HKID, or QR code
2. Filter by certificate status (active/revoked/expired)
3. Filter by receipt status (paid/unpaid/voided)
4. Retrieve audit logs for compliance

## Technical Stack

- **Frontend**: Next.js with Shadcn UI, consistent with existing tab patterns
- **Backend**: Django/Django REST API (same as existing receipt/sickle leave)
- **Database**: PostgreSQL (production), SQLite (development) - new VisitSummary model
- **QR Codes**: Same generation service as existing features
- **PDF Generation**: Same template system as sick leave + receipt

## Data Model

### New Entities

**VisitSummary** (core entity)
- Unique visit identifier
- Patient foreign key
- Date of visit
- Status (active/revoked/expired)

**CertificateLinks** (one-to-one)
- Linked sick leave certificate SREF
- Certificate issue date
- Certificate status

**ReceiptLinks** (one-to-one)
- Associated receipt reference number
- Receipt amount and currency
- Receipt status (paid/unpaid/voided)

**Existing Entities Reused**
- Patient - Patient model (name, HKID, contact info)
- Doctor - Doctor model (name, email, license info)
- SickLeaveCertificate - Existing certificate system
- Receipt - Existing receipt system

## API Endpoints (New)

```
GET /api/visit-summaries/{id}/
- Returns: Complete visit summary with certificate + receipt data
- Auth: Doctor role required

POST /api/visit-summaries/{id}/issue-certificate/
- Issues sick leave certificate for this visit
- Returns: Certificate ID, SREF, QR code token

POST /api/visit-summaries/{id}/generate-receipt/
- Generates receipt for this visit
- Returns: Receipt ID, reference number, QR code token

GET /api/visit-summaries/{id}/verify/{token}/
- Verifies certificate or receipt QR code
- Returns: Status (verified/revoked/expired/fake), details

GET /api/visit-summaries/
- Search visit summaries by patient, date, status
- Auth: Doctor/staff role required
```

## Success Criteria

- [ ] Doctors can issue sick leave certificate + generate receipt in under 3 minutes
- [ ] Both QR codes verify correctly and show appropriate status
- [ ] Search finds visit summaries by patient name, date, or QR code within 5 seconds
- [ ] 100% of issued certificates and receipts have unique QR codes
- [ ] System handles concurrent doctor visits without data conflicts
- [ ] Export functionality works for both certificate and receipt PDFs

## Assumptions

- Existing sick leave certificate feature (spec 002) is fully operational
- Existing receipt feature (spec 005) is fully operational
- Patient page (`/doctor/patients/[patient_id]/`) already includes tab navigation
- Existing patient and doctor profile data is available
- Cryptographic signing approach for digital signatures (as per existing features)
- QR code format consistent across both certificate and receipt

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data inconsistency between certificate and receipt | Confused users, compliance issues | Single VisitSummary entity links both; atomic operations |
| Complex UI combining two different document types | Poor user experience | Consistent tab pattern; separate sections with clear headers |
| Performance degradation with combined data | Slow page loads | Efficient queries; lazy loading; cached summaries |
| Doctor confusion about when to use which document | Workflow errors | Clear UI guidance; tooltips; role-based visibility |

## Dependencies

- `specs/002-sick-leave-certificate` - Fully operational certificate system
- `specs/005-receipt` - Fully operational receipt system
- Django REST API endpoints (existing patterns)
- Next.js frontend (existing tab navigation patterns)
- QR code generation service (existing implementation)

## Next Steps

1. Create feature directory: `specs/007-patient-visit-summary/`
2. Create spec file: `specs/007-patient-visit-summary/spec.md`
3. Validate specification against quality checklist
4. Proceed to planning phase with `/speckit.plan`

---

**Note**: This spec intentionally integrates concepts from both existing features (sick leave certificate and receipt) while maintaining separation of concerns. The VisitSummary model acts as the orchestrator that links both types of records for a single patient visit.