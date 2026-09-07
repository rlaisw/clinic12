# Research: Enable HTTPS

**Date**: 2026-09-05
**Feature**: `009-enable-https`

## Decision: OpenSSL command for RSA 4096-bit self-signed certificate

**Decision**: Use `openssl req` with an OpenSSL config file to generate the certificate.

**Rationale**: OpenSSL 3.0.13 is available on the system. The `openssl req` command with `-x509` flag generates a self-signed certificate. Using a config file for SANs is more reliable than the `-addext` flag across OpenSSL versions. RSA 4096-bit provides strong security for the 30-year validity period.

**Alternatives considered**:
- `openssl ecparam` + `openssl req` for EC P-256: Modern and efficient, but the spec requires RSA. Rejected.
- Using `mkcert` tool: Simpler for dev, but not pre-installed and adds a dependency. Rejected per YAGNI — openssl is already available.
- Let's Encrypt: Not applicable for local development with `.local` or IP-based domains. Rejected.

**Command pattern**:
```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certs/clinic.com.hk.key \
  -out certs/clinic.com.hk.crt \
  -days 10950 \
  -config certs/openssl.cnf
```
(10950 days = 30 years)

---

## Decision: Next.js HTTPS dev server approach

**Decision**: Use `http.createServer` with Node.js `https` module wrapping the Next.js app as a custom server.

**Rationale**: Next.js `next dev` does not natively support HTTPS. The simplest approach without adding dependencies is to create a small custom dev server script (`apps/web/server.js`) that:
1. Reads the certificate and key from `certs/`
2. Creates an HTTPS server with Node.js `https` module
3. Routes requests to the Next.js app

This avoids adding nginx or caddy as dependencies (YAGNI — the user only needs HTTPS for local dev).

**Alternatives considered**:
- nginx reverse proxy: Adds complexity and a system dependency. Rejected for local dev simplicity.
- caddy reverse proxy: Same as nginx — unnecessary for local dev.
- `next.config.js` `experimental.https`: Not available in Next.js 16 stable. Rejected.
- `devcert` npm package: Adds a dependency. Rejected per YAGNI.

---

## Decision: Django HTTPS dev server approach

**Decision**: Use `runserver_plus` from `django-extensions` with the `--cert` flag, falling back to a custom management command if `django-extensions` is not installed.

**Rationale**: `django-extensions` provides `runserver_plus` which supports HTTPS via the `--cert` and `--key` flags. If not already installed, we can add it to `requirements.txt`. If the user prefers not to add dependencies, a minimal custom management command using Python's `ssl` module with `WSGIServer` can be used.

**Check**: `django-extensions` is NOT in `requirements.txt`. We will add it as a dev dependency.

**Alternatives considered**:
- `django-sslserver` package: Adds another dependency. Rejected in favor of `django-extensions` which is more commonly used.
- nginx reverse proxy: Same as Next.js — unnecessary for local dev. Rejected.
- Python `ssl` module with custom server: More code, less maintainable. Falls back to this only if `django-extensions` installation fails.

---

## Decision: Testing approach for HTTPS setup

**Decision**: Create a test script (`certs/test_https.sh`) that validates:
1. Certificate generation (files exist, correct SANs, 30-year validity)
2. Frontend HTTPS connectivity (curl with `--insecure` to `https://kilo.clinic.com.hk:3001`)
3. Backend HTTPS connectivity (curl with `--insecure` to `https://kilo.clinic.com.hk:8000`)
4. Mixed-content check (frontend API calls use HTTPS, not HTTP)

**Rationale**: No test framework is currently configured for this project. A shell script using `curl` and `openssl` commands is the simplest test approach that requires no new dependencies (YAGNI). The tests validate the HTTPS setup end-to-end.

**Alternatives considered**:
- Jest/Vitest for frontend tests: No test runner installed, adding one is out of scope for this feature. Rejected.
- pytest for backend tests: `pytest` is not in `requirements.txt`. A shell script is simpler for infrastructure validation. Rejected.
- Python script with `requests`: Overkill for infrastructure validation. Rejected.

**Error handling tests to include**:
- Missing certificate file → graceful error message
- Invalid certificate → clear error message
- Port conflict (port already in use) → graceful exit with message
- Certificate generation failure → clear error and cleanup

---

## Decision: Error handling strategy

**Decision**: Implement error handling at three layers:

1. **Certificate generation script**: Check for openssl availability, validate output files exist, verify certificate properties (SANs, validity period, key size). Exit with clear error message on failure.

2. **Next.js custom server**: Wrap `https.createServer` in try/catch. Check for certificate file existence before starting. Log clear error messages and exit if SSL setup fails.

3. **Django runserver_plus**: The tool itself handles SSL errors, but we add pre-flight checks (cert file exists, key file readable) before starting the server.

**Error types to handle**:
- `ENOENT`: Certificate or key file not found
- `EADDRINUSE`: Port already in use
- `ERR_CRYPTO`: Invalid certificate or key format
- `ECONNREFUSED`: Server not responding (for client-side checks)

---

## Summary of research findings

| Topic | Decision | Key artifact |
|-------|----------|-------------|
| Certificate generation | openssl req with config file | `certs/openssl.cnf`, `certs/generate.sh` |
| Next.js HTTPS | Custom server with Node.js https module | `apps/web/server.js` |
| Django HTTPS | django-extensions runserver_plus | Added to `requirements-dev.txt` |
| Testing | Shell script with curl + openssl | `certs/test_https.sh` |
| Error handling | Three-layer: cert script, Next.js server, Django pre-flight | Integrated in all artifacts |

---

## Implementation Notes (post-implementation findings)

**Decision**: Added `Werkzeug` and `pyOpenSSL` to `backend/requirements.txt`.

**Rationale**: `runserver_plus` with `--cert`/`--key` flags requires both `Werkzeug` (for the dev server) and `pyOpenSSL` (for SSL support). These are optional dependencies of `django-extensions` that weren't auto-installed.

**Decision**: Do NOT use `--noreload` with `runserver_plus` SSL mode.

**Rationale**: The `--noreload` flag causes a `KeyError: 'WERKZEUG_SERVER_FD'` when combined with SSL. The flag is incompatible with Werkzeug's `run_simple` in SSL mode. The auto-reloader remains enabled (acceptable for local dev).

**Decision**: Add bare hostname `kilo.clinic.com.hk` (without port) to `allowedDevOrigins` in `next.config.ts`.

**Rationale**: Next.js checks `allowedDevOrigins` against the request origin. The HMR connection origin is `kilo.clinic.com.hk` (without port), so the exact hostname must be in the list — `kilo.clinic.com.hk:3001` alone does not match.

**Decision**: Updated `start-dev.sh` to start both servers over HTTPS.

**Rationale**: The original script started the backend with plain `runserver` (HTTP). Updated to use `runserver_plus` with `--cert`/`--key`. Health checks updated to use HTTPS URLs with `curl -k`.
