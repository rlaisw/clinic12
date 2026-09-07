# Feature Specification: pdf-preview-icon

**Feature Branch**: `004-pdf-preview-icon`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "in this tab page https://kilo.clinic.com.hk/doctor/patients/[patient-id]/sick-leave-certificate i want to add a icon for preview "sick leave certificate" pdf file"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview Sick Leave Certificate PDF (Priority: P1)

A doctor viewing a patient's sick leave certificate data wants to preview the associated PDF file without navigating away from the tab page.

**Why this priority**: This is the core functionality requested - enabling instant access to the PDF document directly from the sick leave certificate tab.

**Independent Test**: User can click the preview icon and view the PDF in an inline modal, then close it and continue working in the same tab.

**Acceptance Scenarios**:

1. **Given** a patient's sick leave certificate tab is open, **When** the PDF preview icon is clicked, **Then** the PDF displays in an inline modal overlay
2. **Given** the PDF is displayed in the modal, **When** the user clicks the close button or presses ESC, **Then** the modal closes and focus returns to the tab page

### User Story 2 - Access PDF if Not Visible (Priority: P2)

A user needs to access the PDF when it fails to display or is corrupted.

**Why this priority**: Provides fallback mechanism for error scenarios.

**Independent Test**: User can download the PDF directly from a backup link on the tab page.

**Acceptance Scenarios**:

1. **Given** the PDF fails to load in the modal, **When** an error occurs, **Then** a download link is available below the preview area

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a preview icon on the sick leave certificate tab page
- **FR-002**: Clicking the preview icon MUST open an inline modal displaying the PDF
- **FR-003**: The inline modal MUST include a close button and support ESC key to close
- **FR-004**: System MUST provide a download link if PDF fails to load in the modal
- **FR-005**: The modal MUST be responsive and work on both desktop and mobile devices
- **FR-006**: The modal MUST support basic touch interactions (tap to close, pinch-to-zoom) on mobile devices

### Key Entities

- **Sick Leave Certificate**: PDF document containing the patient's sick leave certificate, stored server-side and accessible via a secure endpoint
- **Preview Icon**: UI element (typically an eye or document icon) that triggers the PDF preview modal
- **Inline Modal**: A modal dialog that overlays the current page content without navigation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users successfully preview the PDF in an inline modal within 3 seconds
- **SC-002**: 100% of modal displays include a visible close mechanism (button or ESC key)
- **SC-003**: Users can navigate back to the tab content after closing the modal without losing their position
- **SC-004**: The PDF preview works across Chrome, Firefox, Safari, and Edge browsers

## Assumptions

- Backend already serves the PDF file via a secure `GET /api/sick-leave-certificates/{id}/pdf` endpoint (doctor permission required)
- The PDF file exists and is accessible for the current patient record
- Users have basic computer literacy to use modal dialogs

## Clarifications

### Session 2026-07-31

- Q: Which user roles are authorized to preview the sick leave certificate PDF? → A: Doctors only (matches the user story and minimizes scope creep)
- Q: Should a loading indicator be displayed while the PDF is being fetched and rendered? → A: Show loading spinner (best UX practice, sets user expectations)
- Q: How should the sick leave certificate PDF be generated? → A: On-demand generation via secure endpoint (matches typical backend patterns)