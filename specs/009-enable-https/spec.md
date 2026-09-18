# Feature Specification: Enable HTTPS for Local Development

**Feature Branch**: `009-enable-https`

**Created**: 2026-09-05

**Status**: Implemented

**Input**: User description: "i want to enable https in current project clinic12 - i added "10.161.92.142  kilo.clinic.com.hk" in /etc/hosts file - help to create a self sign certificate 30 years with domain name clinic.com.hk"

## Clarifications

### Session 2026-09-05

- Q: Where should the certificate and key files be stored? → A: `certs/` directory at project root
- Q: Should the certificate include the IP address 10.161.92.142 as a SAN? → A: No — domain names only
- Q: Is HTTPS required for the Django backend (port 8000), or only the frontend? → A: Both frontend and backend must serve HTTPS
- Q: What RSA key size should the certificate use? → A: RSA 4096

> **Post-implementation note**: the deployment moved from the local dev hostname `kilo.clinic.com.hk` to the Tailscale funnel host **`vps.tailb5775.ts.net`** (plus `clinic.com.hk`). `bash certs/generate.sh` now validates that the SAN includes `vps.tailb5775.ts.net` and `clinic.com.hk`.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Access Clinic App over HTTPS (Priority: P1)

As a clinic staff member using the web application locally, I want to access the clinic app over HTTPS (https://kilo.clinic.com.hk) so that my login credentials and session tokens are encrypted in transit.

**Why this priority**: P1 — HTTPS is a fundamental security requirement for any application handling user credentials. Without HTTPS, login credentials and auth tokens are sent in plaintext over the network, exposing them to interception.

**Independent Test**: Can be tested by opening `https://kilo.clinic.com.hk:3001` in a browser, accepting the self-signed certificate warning, and confirming the login page loads with a padlock icon indicating a secure connection.

**Acceptance Scenarios**:

1. **Given** the development server is running, **When** I navigate to `https://kilo.clinic.com.hk:3001`, **Then** the clinic login page loads with a browser security indicator showing a secure connection (after accepting the self-signed certificate).
2. **Given** I am on the HTTPS login page, **When** I enter valid credentials and submit, **Then** I am authenticated and redirected to the patient queue dashboard over HTTPS without errors.
3. **Given** the HTTPS frontend is running, **When** I inspect the browser's security panel, **Then** the certificate is valid and shows the domain `kilo.clinic.com.hk`.

---

### User Story 2 - Backend API Serves over HTTPS (Priority: P2)

As a system administrator, I want the Django backend API to also be accessible over HTTPS so that all API traffic (including auth token exchange) is encrypted end-to-end.

**Why this priority**: P2 — All client communication should be encrypted, including direct API access. The frontend makes API calls to the backend, and serving both over HTTPS ensures no plaintext credential or token exchange occurs on the local network.

**Independent Test**: Can be tested by making a request to `https://kilo.clinic.com.hk:8000/api/auth/user/` in a browser and confirming the connection is secure (after accepting the self-signed certificate).

**Acceptance Scenarios**:

1. **Given** the backend server is running with HTTPS, **When** I access `https://kilo.clinic.com.hk:8000/api/`, **Then** the API responds over a secure connection.
2. **Given** the HTTPS backend is running, **When** I perform a login via the frontend, **Then** the auth token request is transmitted over HTTPS to the backend.

---

### User Story 3 - Certificate Validity Duration (Priority: P3)

As a developer, I want the self-signed certificate to be valid for 30 years so that it does not expire during the typical development lifecycle and require frequent regeneration.

**Why this priority**: P3 — This is a development convenience feature, not a user-facing capability. The 30-year duration reduces friction during extended development cycles.

**Independent Test**: Can be tested by inspecting the generated certificate and confirming the expiration date is approximately 30 years from the generation date.

**Acceptance Scenarios**:

1. **Given** a self-signed certificate has been generated, **When** I check the certificate expiration date, **Then** it shows an expiry date approximately 30 years from the generation date.
2. **Given** the certificate has been generated with domain names, **When** I inspect the certificate's Subject Alternative Names, **Then** it includes `kilo.clinic.com.hk` and `clinic.com.hk`.

---

### Edge Cases

- What happens when the user accesses the app via `localhost:3001` over HTTP — this should still work as the HTTP dev server remains available alongside HTTPS.
- What happens when the browser blocks self-signed certificates — the user must manually accept the certificate exception in the browser.
- What happens when the certificate is close to expiration — not applicable for 30-year validity, but documented as a future concern if the duration is shortened.
- What happens when the IP address changes (e.g., `10.161.92.142` is dynamic) — the `/etc/hosts` entry may need updating. IP address SANs are intentionally excluded; users must access via the hostname `kilo.clinic.com.hk`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a self-signed SSL/TLS certificate with RSA 4096-bit encryption, valid for 30 years, with `kilo.clinic.com.hk` and `clinic.com.hk` as Subject Alternative Names (domain names only, no IP SANs).
- **FR-002**: The Next.js frontend (port 3001) MUST be serveable over HTTPS using the generated certificate stored in `certs/` at the project root.
- **FR-003**: The Django backend (port 8000) MUST be serveable over HTTPS using the same generated certificate stored in `certs/` at the project root.
- **FR-004**: The `/etc/hosts` entry mapping `10.161.92.142` to `kilo.clinic.com.hk` MUST be documented in the setup instructions.
- **FR-005**: Development instructions MUST document how to start both frontend and backend servers over HTTPS.

### Key Entities *(include if feature involves data)*

- **SSL/TLS Certificate**: A self-signed X.509 certificate with a 30-year validity period, RSA 4096-bit key, containing Subject Alternative Names (SANs) for `kilo.clinic.com.hk` and `clinic.com.hk`. Stored as `certs/clinic.com.hk.crt`.
- **Certificate Private Key**: The RSA 4096-bit private key used to generate the certificate, stored as `certs/clinic.com.hk.key` at the project root. Listed in `.gitignore` to prevent accidental commit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A self-signed certificate is generated with a validity period of approximately 30 years (within 365 days tolerance) and can be verified with certificate inspection tools.
- **SC-002**: At least 90% of clinic staff users can successfully access the login page over HTTPS (`https://kilo.clinic.com.hk:3001`) after accepting the browser certificate warning.
- **SC-003**: The login form submission succeeds over HTTPS with no mixed-content warnings or authentication errors in the browser console.
- **SC-004**: Both the frontend (port 3001) and backend (port 8000) serve content over HTTPS simultaneously without conflicts.

## Assumptions

- The development environment runs on a machine with `openssl` available (standard on Linux/macOS).
- The IP address `10.161.92.142` is the local development machine's network IP.
- The `/etc/hosts` entry has already been added by the user (mapping `10.161.92.142` to `kilo.clinic.com.hk`).
- Self-signed certificates are acceptable for local development (not for production).
- The frontend and backend can be started independently with HTTPS configuration.
- Users will need to manually accept the self-signed certificate in their browser's security settings.
- Users will access the application via the hostname `kilo.clinic.com.hk`, not the raw IP address.
- The private key file will be excluded from version control via `.gitignore`.
