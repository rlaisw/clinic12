# Quickstart: Enable HTTPS

## Prerequisites

- `openssl` installed (system-level)
- `python3` with Django backend dependencies installed (`pip install -r backend/requirements.txt`)
- Additional Django HTTPS dependencies: `pip install django-extensions Werkzeug pyOpenSSL`
- Node.js dependencies installed (`pnpm install`)
- `/etc/hosts` entry: `10.161.92.142  kilo.clinic.com.hk`

## Step 1: Generate Self-Signed Certificate

```bash
cd /home/administrator/kilocode/clinic12
bash certs/generate.sh
```

**Expected output**:
```
✓ Self-signed certificate generated successfully
  Certificate: certs/clinic.com.hk.crt
  Private Key: certs/clinic.com.hk.key
  Domains: kilo.clinic.com.hk, clinic.com.hk
  Validity: 30 years
  Key: RSA 4096-bit
```

**Error handling test cases**:
- If `openssl` is not installed: Script exits with "Error: openssl is not installed"
- If `certs/` directory cannot be created: Script exits with permission error
- If certificate generation fails mid-way: Script cleans up partial files and exits with error

## Step 2: Update .gitignore

Add the following line to `.gitignore` to exclude the private key:

```gitignore
certs/*.key
```

(The `.gitignore` already excludes `*.pem` files. This has already been done.)

## Step 3: Start Both Services Over HTTPS

**Option A — Using the launcher script (recommended):**

```bash
cd /home/administrator/kilocode/clinic12
bash start-dev.sh
```

This starts:
- Django backend on `https://kilo.clinic.com.hk:8000` (using `runserver_plus` with SSL)
- Next.js frontend on `https://kilo.clinic.com.hk:3001` (using `node server.js`)

**Option B — Manual startup (separate terminals):**

Terminal 1 (Django backend):
```bash
cd /home/administrator/kilocode/clinic12/backend
DJANGO_SETTINGS_MODULE=config.settings python3 manage.py runserver_plus 0.0.0.0:8000 --cert ../certs/clinic.com.hk.crt --key ../certs/clinic.com.hk.key
```
```

Terminal 2 (Next.js frontend):
```bash
cd /home/administrator/kilocode/clinic12/apps/web
pnpm dev
```

**Error handling test cases**:
- If cert/key files missing: Server prints error and exits
- If port 3001 is in use: Server prints "EADDRINUSE" and exits
- If TLS handshake fails: Server prints SSL error and exits

## Step 5: Verify HTTPS

### Test Case 1: Certificate Validation

```bash
# Verify certificate files exist
test -f certs/clinic.com.hk.crt && echo "PASS: Certificate file exists" || echo "FAIL"
test -f certs/clinic.com.hk.key && echo "PASS: Key file exists" || echo "FAIL"

# Verify certificate CN
openssl x509 -noout -subject -in certs/clinic.com.hk.crt | grep "CN=kilo.clinic.com.hk" && echo "PASS: CN correct" || echo "FAIL"

# Verify SANs
openssl x509 -noout -ext subjectAltName -in certs/clinic.com.hk.crt | grep -q "kilo.clinic.com.hk" && echo "PASS: SAN kilo.clinic.com.hk" || echo "FAIL"
openssl x509 -noout -ext subjectAltName -in certs/clinic.com.hk.crt | grep -q "clinic.com.hk" && echo "PASS: SAN clinic.com.hk" || echo "FAIL"

# Verify validity (30 years = 10950 days)
openssl x509 -noout -dates -in certs/clinic.com.hk.crt
# Check notAfter is at least 29 years from now

# Verify key size
openssl x509 -noout -text -in certs/clinic.com.hk.crt | grep "Public-Key" | grep "4096" && echo "PASS: RSA 4096" || echo "FAIL"
```

### Test Case 2: Frontend HTTPS Connectivity

```bash
# Test frontend is accessible over HTTPS
curl -k --max-time 5 https://kilo.clinic.com.hk:3001/login 2>&1 | head -5
# Expected: HTTP 200 with login page HTML

# Test no mixed content (login page should not load HTTP resources)
curl -k -s https://kilo.clinic.com.hk:3001/login | grep -c "http://" || echo "PASS: No HTTP resources"
```

**Error handling test case**: If backend is not running:
```bash
curl -k -s https://kilo.clinic.com.hk:3001/login 2>&1
# Expected: Login page still loads (frontend doesn't require backend at page load)
```

### Test Case 3: Backend HTTPS Connectivity

```bash
# Test backend API is accessible over HTTPS
curl -k --max-time 5 https://kilo.clinic.com.hk:8000/api/ 2>&1
# Expected: JSON response (not connection refused)
```

### Test Case 4: End-to-End Login Flow

```bash
# Test login over HTTPS
curl -k -X POST https://kilo.clinic.com.hk:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
# Expected: JSON response with token
```

### Test Case 5: Mixed Content Check

```bash
# Verify frontend is NOT making HTTP requests to backend
# Check that NEXT_PUBLIC_API_URL is set to HTTPS
grep -r "http://" apps/web/app/ | grep -v "http://" | grep -v node_modules || echo "PASS: No HTTP endpoints"
```

### Test Case 6: Error Recovery

```bash
# Test that error pages work over HTTPS
curl -k -s -o /dev/null -w "%{http_code}" https://kilo.clinic.com.hk:3001/nonexistent
# Expected: 404

# Test that expired/invalid token is handled
curl -k -s https://kilo.clinic.com.hk:8000/api/auth/user/ -H "Authorization: Token INVALID"
# Expected: 401 Unauthorized
```

## Error Handling Summary

| Scenario | How to reproduce | Expected behavior |
|----------|-----------------|-------------------|
| Certificate not generated | Run HTTPS server without running `generate.sh` | Clear error: "Certificate file not found... Run `bash certs/generate.sh` first" |
| Port already in use | Start server when port is occupied | Clear error: "Port is already in use" |
| Backend down when frontend loads | Start frontend only | Frontend loads, API calls fail gracefully with user-friendly message |
| Invalid credentials over HTTPS | Attempt login with wrong password | 401 response, login form shows error message |
| Browser doesn't trust cert | Open https:// URL in fresh browser | Browser shows certificate warning, user accepts to proceed |

## Quick Validation Script

```bash
# Run the built-in test suite (requires both servers running)
cd /home/administrator/kilocode/clinic12
bash certs/test_https.sh all
```

**Expected output:** `=== Results: 10 passed, 0 failed ===`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser won't accept self-signed cert | Manually add exception or import cert into OS trust store |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL=https://kilo.clinic.com.hk:8000/api` in `.env.local` |
| CORS errors over HTTPS | Ensure `kilo.clinic.com.hk:3001` is in `CORS_ALLOWED_ORIGINS` in Django settings |
| Certificate hostname mismatch | Regenerate with correct SANs using `bash certs/generate.sh` |
| Middleware deprecation warning in Next.js | Non-blocking: `middleware.ts` is deprecated in Next.js 16 in favor of "proxy" convention. Function still works. |
| `KeyError: WERKZEUG_SERVER_FD` on backend | Remove `--noreload` from `runserver_plus` command (incompatible with SSL mode) |
| HMR blocked (cross-origin dev tools) | Ensure bare hostname `kilo.clinic.com.hk` is in `allowedDevOrigins` in `next.config.ts` |
| `runserver_plus: command not found` | Install: `pip install django-extensions Werkzeug pyOpenSSL` |
