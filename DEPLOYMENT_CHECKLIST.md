# Clinic12 - Production Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Preparation
- [ ] Verify Python 3.12+ runtime availability (`python3 --version`)
- [ ] Node.js >= 18 + pnpm 10.x: `npm install -g pnpm@10.19.0`
- [ ] Set up environment variables in `backend/.env`:
  - DJANGO_SECRET_KEY (generate: `openssl rand -hex 32`)
  - DATABASE_URL=sqlite:///db.sqlite3 (dev) or your PostgreSQL DSN
  - DEBUG=False (production)
  - ALLOWED_HOSTS=[production_domain]
  - FRONTEND_BASE_URL=https://vps.tailb5775.ts.net
  - DIFY_BASE_URL=https://vps.tailb5775.ts.net
  - HF_TOKEN
- [ ] Frontend env `apps/web/.env`: `NEXT_PUBLIC_API_URL=/api`

### 2. Security Configuration
- [ ] Run Django security checks: `backend/venv/bin/python manage.py check --deploy`
- [ ] Configure HTTPS/SSL certificates (`bash certs/generate.sh`)
- [ ] Set up CSRF_TRUSTED_ORIGINS / CORS_ALLOWED_ORIGINS in `backend/config/settings.py` (contains `vps.tailb5775.ts.net`
      and dev IPs)
- [ ] Set SECURE_BROWSER_XSS_FILTER / SECURE_CONTENT_TYPE_NOSNIFF / SECURE_HSTS_SECONDS for production
- [ ] Configure SSRF proxy settings to restrict internal access
- [ ] Set up Tailscale Funnel for secure external access (see below)
- [ ] Verify token-based authentication for all API endpoints

### 3. Database Preparation
- [ ] Run migrations: `backend/venv/bin/python manage.py migrate`
- [ ] Create initial roles/users (e.g., `setup_roles` script)
- [ ] Create database backup strategy
- [ ] Set up LanceDB for RAG embeddings (if using AI features)

### 4. Static Files & Assets
- [ ] Collect static files: `backend/venv/bin/python manage.py collectstatic`
- [ ] Verify Next.js production build: `pnpm build`
- [ ] Configure CDN for static/media assets (optional)

### 5. Application Configuration
- [ ] Set LOGGING configuration for production
- [ ] Configure cache backend (Redis/Memcached) if applicable
- [ ] Set up monitoring and error tracking (Sentry) if applicable
- [ ] Configure Dify API endpoints for AI features

### 6. Testing & Validation
- [ ] Run backend test suite: `backend/venv/bin/python manage.py test`
- [ ] Run CI pipeline locally: `pnpm --filter web run check-types`, `pnpm --filter web exec eslint --max-warnings 999`
- [ ] Test receipt generation and QR code verification
- [ ] Test sick leave certificate generation and verification
- [ ] Test Tailscale tunnel connectivity
- [ ] Test AI chatbot integration and RAG query functionality

### 7. Deployment Process
- [ ] CI/CD via GitHub Actions (`.github/workflows/ci.yml` + `deploy.yml`)
- [ ] Configure health check endpoints
- [ ] Set up rollback procedures
- [ ] Document deployment steps for team

### 8. Post-Deployment Verification
- [ ] Smoke test critical medication workflows
- [ ] Verify dashboard loads correctly
- [ ] Test medication creation/update/deletion
- [ ] Confirm alert system functioning
- [ ] Check logs for errors/warnings
- [ ] Test AI chatbot functionality
- [ ] Test receipt and certificate generation
- [ ] Verify Tailscale funnel connectivity

## HTTPS / Reverse Proxy Setup (this project)

One public listener (`https://vps.tailb5775.ts.net/` = Tailscale funnel → Next.js :3001) proxies to both backends:

1. **Regenerate certs** (San covers `vps.tailb5775.ts.net` + `clinic.com.hk`): `bash certs/generate.sh`
2. **Start backend + frontend**: `bash start-all.sh fg`
   - Backend: `https://127.0.0.1:8000` (Werkzeug, self-signed)
   - Frontend: `https://127.0.0.1:3001` (`server.js`, self-signed)
3. **Tailscale Funnel** exposes the frontend publicly:
   ```bash
   tailscale funnel --bg https+insecure://127.0.0.1:3001
   ```
   → `https://vps.tailb5775.ts.net/`
4. **Origin proxy** (`apps/web/server.js`) routes internally:
   - `/api/*` → Django :8000
   - `/dify/*`, `/chat/*`, `/socket.io/*`, `/assets/` → Dify `10.0.1.75:80` (no public :443 listener needed)
5. **Port ownership**:
   - Dify nginx binds `10.0.1.75:80/443` only (set `EXPOSE_NGINX_PORT=10.0.1.75:80`, `EXPOSE_NGINX_SSL_PORT=10.0.1.75:443`)
   - Funnel binds `100.73.67.34:443` — both coexist on the same host.
6. **Dev HMR**: funnel host must be in `apps/web/next.config.ts` → `allowedDevOrigins`.

## Port Reference
| Port | Service | Protocol |
|---|---|---|
| 3000 | docs (Next.js, unused in prod) | HTTP |
| 3001 | Next.js frontend + origin proxy | HTTPS (self-signed) |
| 8000 | Django backend | HTTPS (self-signed) |
| 80/443 | Dify nginx (bound to `10.0.1.75`) | HTTP/HTTPS (internal only) |

## Code Search Index (optional, for dev)
- cocoindex-code: `ccc index` (project-level `.cocoindex_code/`)
- codebase-memory: graph index, auto-refresh

## Medication-Specific Checks

### Inventory Management
- [ ] Test low stock alert triggering
- [ ] Verify expiring soon alert logic
- [ ] Validate stock value calculations
- [ ] Test inventory history tracking

### Supplier Management
- [ ] Test supplier information validation
- [ ] Verify contact information completeness
- [ ] Test supplier data import/export

### Reporting & Analytics
- [ ] Verify medication usage reports
- [ ] Test inventory valuation reports
- [ ] Confirm expiry date reporting

## AI Features

### RAG System
- [ ] Verify LanceDB embeddings are up to date
- [ ] Test patient data retrieval via RAG API (`https://vps.tailb5775.ts.net:8000/api/rag/query`)
- [ ] Verify hybrid search functionality works correctly
- [ ] Test patient ID extraction from queries

### AI Chatbot
- [ ] Verify the in-app AI Chatbot tab loads (`/doctor/patients/{id}/ai-chatbot` → `DifyChat`)
- [ ] Test chatbot responses for patient queries (direct API via `/dify/api/chat-messages`)
- [ ] Verify authentication (Dify webapp passport + Django token) is valid
- [ ] Long queries may take > 3 min (LLM table re-formatting) — proxy timeout is 420 s
- [ ] Confirm `api_medication_history` view exists: `backend/venv/bin/python manage.py shell -c "from django.db import connection; c=connection.cursor(); c.execute(\"SELECT name FROM sqlite_master WHERE type='view'\"); print(c.fetchall())"` (applied by migration `api.0019_medication_history_view`)
- [ ] Confirm `/api/sql/` tolerates malformed SQL (trailing prose without `;`) instead of returning `syntax error`
- [ ] Confirm a medication-history question ("what medications did X take in the last 6 months") returns entries from active + past + prescription tables
- [ ] Confirm a diagnosis recorded via certificate/receipt/prescription auto-creates an `api_medicalhistory` row (signal `record_diagnosis`)
- [ ] After editing the Dify workflow prompt, re-import `rag/dify_workflow.yml`/`.json` into Dify Studio and republish — repo files alone do not update the live bot

### Document Generation
- [ ] Test receipt PDF generation with fillable fields
- [ ] Verify QR code generation and scanning
- [ ] Test document status transitions (active/revoked/expired)
- [ ] Verify document verification endpoint works

## Infrastructure Checks

### Tailscale Configuration
- [ ] Verify Tailscale Funnel is running: `tailscale funnel status`
- [ ] Test HTTPS endpoints via Tailscale
- [ ] Verify tunnel connectivity from external networks

### SSRF Proxy
- [ ] Verify proxy is running and accessible
- [ ] Test internal service access through proxy
- [ ] Verify IP allowlisting is working correctly

### Database
- [ ] Verify SQLite/PostgreSQL is running and accessible
- [ ] Test database backup and restore procedures
- [ ] Monitor database performance and connection counts