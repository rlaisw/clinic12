# HTTPS Server Contract

## Purpose

Defines the contract for serving both the Next.js frontend and Django backend over HTTPS using the generated self-signed certificate.

## Frontend: Next.js (port 3001)

### Approach

Create a custom dev server (`apps/web/server.js`) that wraps the Next.js app with Node.js `https.createServer`.

### Contract

1. Read certificate from `certs/clinic.com.hk.crt` (path resolved relative to project root)
2. Read private key from `certs/clinic.com.hk.key` (path resolved relative to project root)
3. Create HTTPS server using `https.createServer({ cert, key }, nextApp)`
4. Listen on port 3001 with host `0.0.0.0` (accessible via network IP)

### Error Handling

| Error Condition | Error Message | Action |
|-----------------|---------------|--------|
| Certificate file not found | "Error: Certificate file not found at certs/clinic.com.hk.crt. Run `bash certs/generate.sh` first." | Exit 1 |
| Key file not found | "Error: Key file not found at certs/clinic.com.hk.key. Run `bash certs/generate.sh` first." | Exit 1 |
| Invalid certificate format | "Error: Invalid certificate format: {detail}." | Exit 1 |
| Invalid key format | "Error: Invalid private key format: {detail}." | Exit 1 |
| Port 3001 in use | "Error: Port 3001 is already in use. Please stop the conflicting process or use a different port." | Exit 1 |
| TLS handshake failure | "Error: HTTPS server initialization failed: {detail}." | Exit 1 |

### Dev Script

The `apps/web/package.json` dev script changes from:
```json
"dev": "next dev --port 3001"
```
to:
```json
"dev": "node server.js"
```

### Start Command

```bash
# From project root
pnpm --filter web dev
```

## Backend: Django (port 8000)

### Approach

Use `django-extensions` `runserver_plus` with `--cert` and `--key` flags. Add `django-extensions` to development dependencies.

### Contract

1. Check that certificate and key files exist before starting
2. Run: `python backend/manage.py runserver_plus 0.0.0.0:8000 --cert certs/clinic.com.hk.crt --key certs/clinic.com.hk.key`
3. Server must listen on `0.0.0.0:8000` for HTTPS

### Error Handling

| Error Condition | Error Message | Action |
|-----------------|---------------|--------|
| `django-extensions` not installed | "Error: django-extensions is required for HTTPS dev server. Install: pip install django-extensions" | Exit 1 |
| Certificate file not found | "Error: Certificate file not found at certs/clinic.com.hk.crt. Run `bash certs/generate.sh` first." | Exit 1 |
| Key file not found | "Error: Key file not found at certs/clinic.com.hk.key. Run `bash certs/generate.sh` first." | Exit 1 |
| Invalid certificate/key | "Error: SSL configuration error: {detail}." | Exit 1 |

### Dev Script

Add to `package.json` root scripts:
```json
"dev:backend:https": "cd backend && python manage.py runserver_plus 0.0.0.0:8000 --cert ../certs/clinic.com.hk.crt --key ../certs/clinic.com.hk.key"
```

### Start Command

```bash
# From project root
python backend/manage.py runserver_plus 0.0.0.0:8000 --cert certs/clinic.com.hk.crt --key certs/clinic.com.hk.key
```

## Frontend-to-Backend Communication Over HTTPS

### Contract

1. The Next.js frontend must call the backend API over HTTPS when loaded over HTTPS
2. The `NEXT_PUBLIC_API_URL` environment variable must be set to `https://kilo.clinic.com.hk:8000/api`
3. The axios client (`apps/web/lib/api.ts`) must use the HTTPS base URL

### Error Handling

| Error Condition | Error Message | Action |
|-----------------|---------------|--------|
| Backend unreachable over HTTPS | Console warning: "Backend API at https://kilo.clinic.com.hk:8000 is not reachable" | Show user-friendly error in UI |
| Mixed content (frontend HTTPS, backend HTTP) | Browser console: "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'" | Prevent HTTP fallback in API client |
| Certificate mismatch | Browser shows certificate warning | User must accept self-signed certificate |
| 401 from backend | Redirect to login page | Handled by axios interceptor |
| Network error | Show retry dialog | Handled by React Query |
