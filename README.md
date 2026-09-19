# Clinic12 - Medication & Patient Management System

## Overview
Clinic12 is a full-stack medication and patient management system integrating a React/Next.js frontend with a Django backend. The system provides comprehensive medication inventory management, patient records, and AI-powered assistance via Dify integration.

## Key Features

### 📊 Medication Management
- Real-time inventory tracking with automatic stock alerts
- Expiry date monitoring and reporting
- Supplier management with contact integration
- Historical inventory tracking and audit trails

### 🏥 Patient Records & Dashboard
- Patient profiles with medical history, prescriptions, and sick leave certificates
- Receipt generation system with fillable PDFs and QR code verification
- AI Chatbot integration for doctor-assisted patient consultations
- Multi-tab patient dashboard (Profile, Medications, Receipts, Sick Leave, AI Chatbot)
- Theme system (Dark/Light/Light Blue/Light Green)

### 🤖 AI-Powered Features
- Dify-powered AI Chatbot for clinical decision support
- Retrieval-Augmented Generation (RAG) for context-aware responses
- SQL tool with tolerance for LLM quirks (trailing-prose recovery, reasoning-preamble stripping, fenced-block extraction)
- Combined `api_medication_history` view (active + past + prescription) so medication-history questions return complete answers
- Auto-populated medical history: any recorded diagnosis (certificate, receipt, prescription, active medication) creates the patient's `MedicalHistory` row
- Secure access via Tailscale tunneling
- Role-based access controls (doctor-only)

### 📋 Document Management
- Sick leave certificate generation with QR verification
- Fillable PDF receipt generation with auto-calculation
- Document status tracking (active/revoked/expired)
- Secure QR code verification system

## Technical Highlights

### Infrastructure
- **Backend**: Django 6.0.6 + Django REST Framework (SQLite for dev)
- **Frontend**: React 19, Next.js 16.2.0, Tailwind CSS, pnpm monorepo
- **AI Stack**: Dify workflow with RAG pipeline and LanceDB vector storage
- **HTTPS**: Self-signed certs for `vps.tailb5775.ts.net` + `clinic.com.hk` — backend on `:8000`, frontend on `:3001`
- **Connectivity**: Tailscale Funnel (`https+insecure://127.0.0.1:3001`) exposing the frontend publicly
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`)
- **Code Search**: cocoindex-code (semantic index) + codebase-memory (graph index)

### Service Layout
One public listener on the VPS — the Tailscale funnel at `https://vps.tailb5775.ts.net/` terminates on the Next.js origin (`:3001`), which then routes internally:
| URL Path | Service | Backend |
|---|---|---|
| `/` (app pages, `_next/`) | Clinic12 Next.js frontend | :3001 (self-signed) |
| `/api/*` | Clinic12 Django backend (proxied) | :8000 (self-signed) |
| `/dify/*` | Dify web UI/API (prefix stripped) | `10.0.1.75:80` (HTTP) |
| `/chat/*` | Dify hosted chatbot (HTML rewritten) | `10.0.1.75:80` (HTTP) |
| `/socket.io/*` | Dify realtime chat socket (upgraded/HTTP) | `10.0.1.75:80` (HTTP) |
| `/assets/ /static/ /fonts/ /images/` | Dify assets | `10.0.1.75:80` (HTTP) |

### Integration Points
1. **Frontend proxy** (`apps/web/server.js`): single HTTPS origin that proxies `/api/*` to Django, and `/dify/*`, `/chat/*`, `/socket.io/*` to the Dify backend — this replaced the retired `kilo.clinic.com.hk` public domain.
2. **Tailscale Funnel**: Exposes the Next.js frontend securely via HTTPS (`+insecure` so the self-signed cert is accepted upstream).
3. **Dify chat client** (`apps/web/components/doctor/dify-chat.tsx`): the in-app AI Chatbot tab talks **directly to the Dify API** (`/dify/api/chat-messages`) with a webapp passport — it does **not** embed Dify's web UI in an iframe.
4. **API Endpoints**:
   - SQL Schema API: `https://vps.tailb5775.ts.net:8000/api/sql/schema`
   - SQL Query API: `https://vps.tailb5775.ts.net:8000/api/sql/` (read-only, LIMIT 200; recovers from malformed LLM SQL)
   - Auth: Django REST Framework with Token Authentication
   - File Generation: Receipt and certificate PDF endpoints
5. **Database**: Relational model with foreign key relationships between patients, medications, receipts, and certificates; LanceDB holds RAG embeddings. `api_medication_history` is a SQLite view unioning the three medication tables for chatbot queries.

## Getting Started
See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for setup instructions.

## Development

### Prerequisites
- Node.js >= 18, pnpm 10.x (`npm install -g pnpm@10.19.0`)
- Python 3.12
- OpenSSL (for self-signed certs)

### Setup
1. Clone repository: `git clone https://github.com/rlaisw/clinic12.git`
2. Install dependencies:
   ```bash
   pnpm install                # frontend (monorepo root)
   python3 -m venv backend/venv
   backend/venv/bin/pip install -r backend/requirements.txt
   ```
3. Environment files:
   - `backend/.env` — `DEBUG`, `SECRET_KEY`, `DATABASE_URL`, `HF_TOKEN`
   - `apps/web/.env` — `NEXT_PUBLIC_API_URL=/api`
4. Generate certs: `bash certs/generate.sh`
5. Start both services: `bash start-all.sh fg`
   - Frontend: `https://vps.tailb5775.ts.net:3001`
   - Backend: `https://vps.tailb5775.ts.net:8000`
   - Public: `https://vps.tailb5775.ts.net/` (funnel auto-started by `start-all.sh`)

### Exposing Publicly (Tailscale Funnel)
```bash
tailscale funnel --bg https+insecure://127.0.0.1:3001
```
Requires `vps.tailb5775.ts.net` in `apps/web/next.config.ts` → `allowedDevOrigins` for dev HMR.

### Code Search Indexing
```bash
ccc index              # semantic index (project-level: .cocoindex_code/)
ccc search <query>     # search the codebase
```
The codebase-memory graph index auto-refreshes on code changes.

## CI/CD
- `.github/workflows/ci.yml` — lint + type-check + backend checks on push/PR to main/develop
- `.github/workflows/deploy.yml` — build + deploy skeleton

## License
MIT