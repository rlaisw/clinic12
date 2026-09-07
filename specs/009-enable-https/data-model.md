# Data Model: Enable HTTPS

## Overview

This feature's "data model" consists of the SSL/TLS certificate artifacts and their relationships. Unlike a typical software feature with database entities, HTTPS setup involves certificate files, private keys, and configuration files that must be generated, stored, and referenced correctly.

## Entities

### 1. SSL/TLS Certificate

- **File Path**: `certs/clinic.com.hk.crt`
- **Type**: X.509 v3 self-signed certificate
- **Key Algorithm**: RSA 4096-bit
- **Validity**: 30 years (10,950 days)
- **Subject**: Common Name (CN) = `kilo.clinic.com.hk`
- **Subject Alternative Names (SANs)**:
  - DNS: `kilo.clinic.com.hk`
  - DNS: `clinic.com.hk`
- **Issuer**: Self-signed (same as subject)
- **Encoding**: PEM (Base64-encoded)
- **Gitignore**: Not ignored (public certificate, safe to commit for dev convenience)
- **Consumers**:
  - Next.js custom HTTPS server (port 3001)
  - Django backend HTTPS server (port 8000)
  - Browser clients (trust establishment)

### 2. Private Key

- **File Path**: `certs/clinic.com.hk.key`
- **Type**: RSA 4096-bit private key
- **Encoding**: PEM (unencrypted, for development convenience)
- **Gitignore**: YES — `.gitignore` already excludes `*.pem`. Must add `*.key` exclusion.
- **Consumers**:
   - Next.js custom HTTPS server (port 3001) — read at startup via Node.js `https` module
   - Django `runserver_plus` (port 8000) — read at startup; requires `Werkzeug` + `pyOpenSSL` for SSL support

### 3. OpenSSL Configuration

- **File Path**: `certs/openssl.cnf`
- **Purpose**: Defines certificate properties (key size, validity period, SANs, subject)
- **Format**: Standard OpenSSL config file format
- **Version**: Compatible with OpenSSL 3.0.x

### 4. Certificate Generation Script

- **File Path**: `certs/generate.sh`
- **Purpose**: Automates certificate creation with error handling
- **Dependencies**: `openssl` (system-level)
- **Inputs**: None (uses fixed configuration)
- **Outputs**: `clinic.com.hk.crt` and `clinic.com.hk.key` in `certs/`
- **Error states**:
  - OpenSSL not installed → exit with message
  - Output directory cannot be created → exit with message
  - Certificate generation fails → exit with message, cleanup partial files

## Relationships

```
certs/openssl.cnf ──generates──→ certs/generate.sh ──runs──→ (openssh)
                                                                  │
                                          ┌─────────────────────┴─────────────────────┐
                                          ↓                                           ↓
                              certs/clinic.com.hk.key              certs/clinic.com.hk.crt
                              (private key, gitignored)            (public cert, PEM)
                                          │                                           │
                              ┌───────────┴───────────┐               ┌────────────────┴──────────┐
                              ↓                       ↓               ↓                           ↓
                    apps/web/server.js      backend/manage.py      Browser client        Django runserver_plus
                    (Next.js HTTPS)         (Django HTTPS)         (trust prompt)        (backend HTTPS)
```

## Validation Rules

| Entity | Rule | Validation Method |
|--------|------|-------------------|
| Certificate | Must have CN = `kilo.clinic.com.hk` | `openssl x509 -noout -subject -in certs/clinic.com.hk.crt` |
| Certificate | Must include SAN `DNS:kilo.clinic.com.hk` | `openssl x509 -noout -ext subjectAltName -in certs/clinic.com.hk.crt` |
| Certificate | Must include SAN `DNS:clinic.com.hk` | Same as above |
| Certificate | Validity must be ≥ 29 years (30-year target, tolerance for rounding) | `openssl x509 -noout -dates -in certs/clinic.com.hk.crt` |
| Certificate | Key size must be RSA 4096 | `openssl x509 -noout -text -in certs/clinic.com.hk.crt \| grep "Public-Key"` |
| Private Key | Must match certificate public key | `diff <(openssl x509 -noout -pubkey -in cert) <(openssl pkey -pubout -in key)` |
| Private Key | Must not be committed to git | Verify `.gitignore` contains `*.key` |
