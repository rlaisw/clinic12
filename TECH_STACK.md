# Clinic12 - Medication & Patient Management System

## 🏗️ Infrastructure & DevOps

### Service Layout (VPS, Ubuntu)
Single public listener — the Tailscale funnel terminates on the Next.js origin, which routes internally:
| URL Path | Service | Notes |
|---|---|---|
| `https://vps.tailb5775.ts.net/` | Clinic12 Next.js frontend | Tailscale Funnel → `https+insecure://127.0.0.1:3001` |
| `https://vps.tailb5775.ts.net:3001` | Next.js frontend (direct) | HTTPS via `apps/web/server.js` (self-signed cert) |
| `https://vps.tailb5775.ts.net:8000` | Django backend | HTTPS via `runserver_plus` (Werkzeug) |
| `https://vps.tailb5775.ts.net/dify/*` | Dify web UI/API | proxied by `server.js` → `10.0.1.75:80` (HTTP, prefix stripped) |
| `https://vps.tailb5775.ts.net/chat/*` | Dify hosted chatbot | proxied by `server.js` → `10.0.1.75:80` (HTTP, HTML rewritten) |
| `https://vps.tailb5775.ts.net/socket.io/*` | Dify realtime chat socket | proxied/upgraded by `server.js` → `10.0.1.75:80` |
| `https://vps.tailb5775.ts.net/api/*` | Django API | proxied by `server.js` → `127.0.0.1:8000` |

### Reverse Proxy / Port Ownership
- `apps/web/server.js` is the single HTTPS origin on `:3001`. It proxies `/api/*` → Django, and `/dify/*`, `/chat/*`, `/socket.io/*`, `/assets/`, `/static/`, `/fonts/`, `/images/` → Dify (`10.0.1.75:80`).
- Dify nginx binds **only** `10.0.1.75:80/443` (private IP) so the Tailscale Funnel can bind `100.73.67.34:443` on the same host.
- Public IP `129.213.26.15` is cloud-NAT'd to `10.0.1.75` (Oracle VPS floating IP).
- The retired `kilo.clinic.com.hk` domain is still rewritten inside piped Dify HTML by `server.js` (old `/api` prefixes → `/dify/api`).

### WebSocket / Dev Server
- `apps/web/server.js` serves HTTPS on :3001 (was plain HTTP — fixed `ERR_SSL_PROTOCOL_ERROR`).
- `apps/web/next.config.ts` `allowedDevOrigins` must include the funnel host (`vps.tailb5775.ts.net`) or dev HMR websockets get blocked/502.
- Dify chat requests can block for minutes (schema + SQL + a final LLM re-formatting large tables) — the proxy timeout is **420 s** in `server.js`.

### 🚀 CI/CD (GitHub Actions)
- `.github/workflows/ci.yml` — lint (frontend + backend), type-check, tests, Django checks, Bandit security scan on push/PR to `main`/`develop`. Uses Node 22 + python 3.12, pnpm workspace.
- `.github/workflows/deploy.yml` — build frontend + collectstatic; deploy job is a placeholder.

### 🔍 Code Search Indexing
- **cocoindex-code (ccc)**: project-level index at `.cocoindex_code/`. Rebuild with `ccc index`, search with `ccc search <query>`.
- **codebase-memory**: graph index (nodes/edges), auto-refresh on change. Tools: `search_graph`, `trace_path`, `get_architecture`.

### 🧩 AI Chatbot Integration (Dify)
- **In-app tab**: `/doctor/patients/{id}/ai-chatbot` renders `<DifyChat appCode="z0RCp1YQHYqySPZF" />` (`apps/web/components/doctor/dify-chat.tsx`) — a **direct-API** client that claims a webapp passport from `/dify/api/passport` then POSTs to `/dify/api/chat-messages` (streaming/blocking supported). Not an iframe.
- **Dify's own web UI** is still reachable at `https://vps.tailb5775.ts.net/dify/` and the hosted chat at `https://vps.tailb5775.ts.net/chat/{app-id}` via the proxy.
- **Auth**: Django Token Authentication (`Authorization: Token <token>`)
- **RAG**: Dify HTTP node → `https://vps.tailb5775.ts.net:8000/api/rag/query` via SSRF proxy; LanceDB stores the embeddings.

### 🌐 Connectivity (Tailscale)
- Device: `vps` — `100.73.67.34` (offers exit node)
- Funnel: `https://vps.tailb5775.ts.net/` → `https+insecure://127.0.0.1:3001`

### 🤝 SSRF Proxy
- `SSRF_PROXY_HTTP_URL` / `SSRF_PROXY_HTTPS_URL` → `http://ssrf_proxy:3128`
- Allows internal IPs for safe RAG/sandbox access.

### Dev Commands
```bash
bash start-all.sh             # backend :8000 + frontend :3001 + funnel (fg|background|stop|restart|status)
bash start-dev.sh             # backend :8000 + frontend :3001 (foreground, no funnel)
bash certs/generate.sh        # regenerate self-signed certs
tailscale funnel --bg https+insecure://127.0.0.1:3001   # expose frontend
ccc index                     # refresh semantic index
```

### Troubleshooting Quick Reference
| Symptom | Fix |
|---|---|
| `ERR_CONNECTION_REFUSED` on port 443 | Dify nginx bound `0.0.0.0:443` blocking Tailscale funnel — pin nginx to `10.0.1.75:443` |
| `502` on `vps.tailb5775.ts.net` | Funnel target was `http://`/`https://` without `+insecure` → use `https+insecure://127.0.0.1:3001` |
| Dev HMR websocket 502/blocked | Add funnel host to `allowedDevOrigins` in `next.config.ts` |
| Chat "Service temporarily unavailable" | Dify run exceeded 180 s (old timeout) — proxy now waits 420 s; slow table queries may still take minutes |