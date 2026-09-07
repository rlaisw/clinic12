# Implementation Plan: Enable HTTPS

**Branch**: `009-enable-https` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-enable-https/spec.md`
**Additional instructions**: "create test cases and add error handling"

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Enable HTTPS for both the Next.js frontend (port 3001) and Django backend (port 8000) in the clinic12 local development environment using a self-signed RSA 4096-bit certificate valid for 30 years. Certificate files stored in `certs/` at project root with domains `kilo.clinic.com.hk` and `clinic.com.hk` as SANs. Includes test cases for certificate validation and HTTPS connectivity, plus error handling for certificate generation failures and server startup errors. Backend uses `django-extensions` `runserver_plus` with Werkzeug and pyOpenSSL; frontend uses a custom Node.js HTTPS dev server (`apps/web/server.js`).

## Technical Context

**Language/Version**: Python 3.12 (Django 6.0.6), TypeScript 5.9 / React 19 (Next.js 16.2.0)

**Primary Dependencies**: Django, Django REST Framework, django-cors-headers, corsheaders, django-extensions, Werkzeug, pyOpenSSL, Next.js 16, Turborepo, pnpm, axios, @tanstack/react-query

**Storage**: SQLite (`backend/db.sqlite3`)

**Testing**: No test framework currently configured. Backend uses Django's built-in test runner. Frontend has no test runner installed. Test cases will be documented as scripts in `quickstart.md` for certificate validation and HTTPS connectivity checks.

**Target Platform**: Linux server (local development, `10.161.92.142`), web browsers (Chrome, Firefox, Safari)

**Project Type**: Web application (monorepo with frontend + backend)

**Performance Goals**: N/A — development tooling, no production performance requirements

**Constraints**: Self-signed certificate for local development only; `.gitignore` already excludes `*.pem`; no production deployment

**Scale/Scope**: Single developer/team local development environment; both frontend and backend must serve HTTPS simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file (`.specify/memory/constitution.md`) contains only template placeholders with no active governance constraints. No violations applicable.

## Project Structure

### Documentation (this feature)

```text
specs/009-enable-https/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── certificate-contract.md   # Certificate generation contract
│   ├── https-server-contract.md   # HTTPS server startup contract
│   └── error-handling-contract.md  # Error handling contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
clinic12/
├── apps/web/              # Next.js frontend (port 3001)
│   └── app/
│       └── login/          # Login page (already exists)
├── backend/               # Django backend (port 8000)
│   ├── config/
│   │   └── settings.py     # Django settings (CORS, CSRF, SSL config)
│   ├── accounts/           # Auth views (login, logout)
│   └── manage.py           # Django management script
├── certs/                 # NEW: SSL certificate storage
│   ├── clinic.com.hk.crt   # Certificate (public)
│   ├── clinic.com.hk.key   # Private key (gitignored)
│   ├── generate.sh         # Certificate generation script
│   └── openssl.cnf         # OpenSSL config with SANs
└── .gitignore              # Already excludes *.pem
```

**Structure Decision**: The `certs/` directory at project root is selected (per Q1 clarification) to make certificates accessible to both frontend and backend without cross-package path resolution. The `.gitignore` already excludes `*.pem` files; we will add `*.key` exclusion for the private key file.

## Complexity Tracking

> No Constitution Check violations — Complexity Tracking section not needed.

## Phase 0: Research

Research topics identified:
1. OpenSSL command for RSA 4096-bit self-signed certificate with 30-year validity and domain SANs
2. Next.js HTTPS dev server options (custom server vs reverse proxy vs next.config.js)
3. Django HTTPS dev server options (runsslserver vs django-extensions runserver_plus vs nginx proxy)
4. Error handling strategies for certificate generation and server startup
5. Testing approach for HTTPS setup validation in local dev environment

See [research.md](./research.md) for findings.

## Phase 1: Design & Contracts

### Data Model

The "data model" for this feature consists of the certificate artifacts:
- **Certificate file** (`certs/clinic.com.hk.crt`): X.509 public certificate, RSA 4096-bit, 30-year validity, SANs include `kilo.clinic.com.hk` and `clinic.com.hk`
- **Private key** (`certs/clinic.com.hk.key`): RSA 4096-bit private key, stored unencrypted for development convenience

See [data-model.md](./data-model.md) for full details.

### Contracts

- [Certificate Generation Contract](./contracts/certificate-contract.md)
- [HTTPS Server Contract](./contracts/https-server-contract.md)
- [Error Handling Contract](./contracts/error-handling-contract.md)

### Quickstart

See [quickstart.md](./quickstart.md) for validation scenarios, test cases, and error handling checks.

---

**Phase 0 and Phase 1 complete. Ready for `/speckit.tasks`.**
