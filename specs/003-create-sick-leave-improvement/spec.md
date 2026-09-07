# Feature Specification: Create Sick Leave Improvement

**Feature Branch**: `003-create-sick-leave-improvement`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "i want to improve the tab page "create sick leave" url is : https://kilo.clinic.com.hk/doctor/patients/[patient id]/sick-leave-certificate: - Automatically add SREF (unique sick leave reference number) and show on this tab page (create sick leave screen) - Add a new <Textarea>, <Label = Remarks>"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Doctor views SREF on create sick leave screen (Priority: P1)

As a doctor, I want to see a unique Sick Leave Reference (SREF) automatically generated and displayed on the create sick leave screen so that I can reference this unique identifier when issuing a certificate.

**Why this priority**: The SREF is essential for uniquely identifying each sick leave certificate and is a prerequisite for the certificate issuance workflow.

**Independent Test**: Can be fully tested by navigating to the create sick leave page for any patient and confirming a unique SREF is automatically displayed without any action from the doctor.

**Acceptance Scenarios**:

1. **Given** I am viewing the create sick leave screen for a patient, **When** the page loads, **Then** a unique SREF is automatically generated and displayed on the screen.
2. **Given** I navigate to the create sick leave screen for a different patient, **When** the page loads, **Then** a new, unique SREF is generated and displayed (different from any previously generated SREF).
3. **Given** I refresh the create sick leave page, **When** the page reloads, **Then** a new SREF is generated (or the existing one is retained if the form is in progress).

---

### User Story 2 - Doctor adds remarks to sick leave certificate (Priority: P1)

As a doctor, I want to add remarks to the sick leave certificate so that I can provide additional context or notes about the patient's condition or leave recommendation.

**Why this priority**: Remarks allow doctors to capture important clinical context that may be relevant for employers or schools reviewing the certificate.

**Independent Test**: Can be fully tested by entering text into the Remarks field on the create sick leave screen and confirming the text is saved with the certificate.

**Acceptance Scenarios**:

1. **Given** I am on the create sick leave screen, **When** I see the Remarks field, **Then** it is a text area (multi-line input) with a clear label.
2. **Given** I have typed remarks into the Remarks field, **When** I save or issue the certificate, **Then** the remarks are persisted and included in the certificate output.
3. **Given** the Remarks field is optional, **When** I leave it empty and issue the certificate, **Then** the certificate is still issued successfully without remarks.

---

### Edge Cases

- What happens if the SREF generation system is temporarily unavailable?
- How does the system handle a doctor who accidentally navigates away before saving — is the SREF retained or regenerated?
- What is the maximum character limit for the Remarks field?
- What happens if two doctors open the create sick leave screen simultaneously — are the SREFs still unique?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically generate a unique SREF (Sick Leave Reference) when the create sick leave screen loads.
- **FR-002**: System MUST display the generated SREF prominently on the create sick leave screen.
- **FR-003**: Each generated SREF MUST be unique across all certificates — no two certificates may share the same SREF.
- **FR-004**: System MUST provide a Remarks text area field on the create sick leave screen.
- **FR-005**: The Remarks field MUST have a visible label reading "Remarks".
- **FR-006**: The Remarks field MUST support multi-line text input.
- **FR-007**: System MUST persist the Remarks content when the certificate is saved or issued.
- **FR-008**: The Remarks field MUST be optional — certificates can be issued without remarks.

### Key Entities *(include if feature involves data)*

- **SREF (Sick Leave Reference)**: A unique alphanumeric identifier generated for each sick leave certificate. Key attributes: SREF value (unique), generation timestamp, associated certificate ID.
- **Remarks**: Optional free-text field on the sick leave certificate. Key attributes: text content, maximum length, associated certificate ID.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of create sick leave screens display a unique SREF upon loading.
- **SC-002**: No two certificates ever share the same SREF value.
- **SC-003**: Doctors can enter and save remarks (up to 500 characters) in the Remarks field.
- **SC-004**: The Remarks field is visible and labeled correctly on 100% of create sick leave screens.
- **SC-005**: 95% of doctors report the SREF display and Remarks field as helpful for their workflow.

## Assumptions

- The create sick leave screen already exists at `/doctor/patients/[patient id]/sick-leave-certificate`.
- The existing sick leave certificate feature (from spec 002) provides the underlying certificate infrastructure.
- SREF generation uses a standard unique identifier approach (e.g., UUID, sequential numbering with timestamp).
- The Remarks field maximum length follows standard web form conventions (e.g., 500 characters).
- Doctors are already authenticated and authorized to access the create sick leave screen.
- The SREF is displayed in a read-only format (not editable by the doctor).
