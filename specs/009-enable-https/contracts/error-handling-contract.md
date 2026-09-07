# Error Handling Contract

## Purpose

Defines the error handling strategy for the HTTPS setup, covering certificate generation, server startup, and runtime HTTPS communication.

## Layer 1: Certificate Generation (`certs/generate.sh`)

### Error Categories

1. **Environment errors** — Missing prerequisites
   - OpenSSL not installed
   - Missing write permissions to `certs/` directory

2. **Generation errors** — OpenSSL failures
   - Invalid OpenSSL config
   - Key generation failure
   - Certificate signing failure

3. **Validation errors** — Post-generation verification failures
   - Certificate file not created
   - Key file not created
   - Missing required SANs
   - Incorrect validity period
   - Incorrect key size

### Handling Strategy

- **Fail fast**: Check prerequisites before starting generation
- **Clean up on failure**: Remove partial files if generation fails mid-way
- **Clear messages**: Each error includes actionable instructions (e.g., "Run `bash certs/generate.sh` first")
- **Exit codes**: Exit 1 on any error, exit 0 on success
- **No silent failures**: All errors printed to stderr

## Layer 2: Server Startup

### Next.js Frontend (`apps/web/server.js`)

| Error | Detection | Handling |
|-------|-----------|----------|
| Missing certificate file | `fs.existsSync()` before server start | Print error, exit process with code 1 |
| Missing key file | `fs.existsSync()` before server start | Print error, exit process with code 1 |
| Invalid file format | `fs.readFileSync()` + try/catch on `https.createServer()` | Print error, exit process with code 1 |
| Port conflict | `server.listen()` error callback (EADDRINUSE) | Print error, exit process with code 1 |
| TLS handshake error | `https.createServer()` throws | Print error, exit process with code 1 |

### Django Backend

| Error | Detection | Handling |
|-------|-----------|----------|
| Missing certificate file | Pre-flight check script | Print error, exit before `runserver_plus` |
| Missing key file | Pre-flight check script | Print error, exit before `runserver_plus` |
| Port conflict | `runserver_plus` built-in | Django prints error, exits |
| Invalid SSL config | `runserver_plus` at startup | Django prints error, exits |
| `django-extensions` not installed | Check before running | Print install instructions, exit |

## Layer 3: Runtime Communication (Frontend ↔ Backend)

### Axios Interceptor (`apps/web/lib/api.ts`)

| Error | Detection | Handling |
|-------|-----------|----------|
| Network error (backend down) | `error.code === 'ECONNREFUSED'` | Reject promise, React Query shows error |
| TLS certificate error | Browser blocks request | User must accept self-signed cert in browser |
| 401 Unauthorized | `error.response.status === 401` | Clear token, redirect to login (existing logic) |
| 403 Forbidden | `error.response.status === 403` | Show permission error message |
| 500 Server Error | `error.response.status >= 500` | Show generic error, log to console |

### Mixed Content Prevention

| Error | Detection | Handling |
|-------|-----------|----------|
| HTTP request from HTTPS page | Browser console warning | Must not occur — frontend API URL must use HTTPS |
| CORS error over HTTPS | Browser CORS policy | Ensure `CORS_ALLOWED_ORIGINS` in Django includes `https://kilo.clinic.com.hk:3001` |

## Layer 4: User-Facing Error Messages

### In the Browser UI

| Scenario | User-Facing Message |
|----------|-------------------|
| Backend API unreachable | "Unable to connect to the server. Please ensure the backend is running." |
| Certificate not trusted | "Your browser is showing a security warning. Please accept the self-signed certificate to proceed." |
| Login failed (network) | "Login request failed. Please check your connection and try again." |

## Logging Strategy

- **Development**: Console logs for all errors (frontend and backend)
- **Certificate generation**: Output to stdout for success, stderr for errors
- **Server startup**: Print bound address and HTTPS status
- No file-based logging for this dev feature (YAGNI — local development only)
