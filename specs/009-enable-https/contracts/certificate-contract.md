# Certificate Generation Contract

## Purpose

Defines the contract for generating the self-signed SSL/TLS certificate used by both the Next.js frontend and Django backend in local development.

## Inputs

| Parameter | Value | Source |
|-----------|-------|--------|
| Common Name (CN) | `kilo.clinic.com.hk` | Static (from spec FR-001) |
| SANs (DNS) | `kilo.clinic.com.hk`, `clinic.com.hk` | Static (from spec FR-001, clarified Q2: no IP SANs) |
| Key Type | RSA | Static (from spec Key Entities) |
| Key Size | 4096 bits | Clarified (Q4: RSA 4096) |
| Validity | 10,950 days (30 years) | Spec FR-001 |
| Output Format | PEM | OpenSSL default |

## Outputs

| File | Path | Description |
|------|------|-------------|
| Certificate (public) | `certs/clinic.com.hk.crt` | X.509 v3 self-signed certificate |
| Private Key | `certs/clinic.com.hk.key` | RSA 4096-bit private key (unencrypted) |
| OpenSSL Config | `certs/openssl.cnf` | Config file with SANs and subject |

## Contract: `certs/generate.sh`

### Behavior

1. Check that `openssl` is available on the system PATH
2. Create `certs/` directory if it does not exist
3. Write `certs/openssl.cnf` with the required subject and SANs
4. Run `openssl req -x509 -newkey rsa:4096 -nodes` with the config file
5. Verify both output files exist and are non-empty
6. Verify certificate properties (CN, SANs, validity period, key size)
7. Exit 0 on success, exit 1 on any failure

### Error Handling

| Error Condition | Error Message | Action |
|-----------------|---------------|--------|
| `openssl` not found | "Error: openssl is not installed. Please install openssl and retry." | Exit 1 |
| `certs/` directory creation fails | "Error: Failed to create certs/ directory: {detail}" | Exit 1 |
| OpenSSL command fails | "Error: Certificate generation failed: {openssl error output}" | Exit 1, remove partial files |
| Certificate file missing after generation | "Error: Certificate file not created" | Exit 1, cleanup |
| Key file missing after generation | "Error: Key file not created" | Exit 1, cleanup |
| SAN verification fails | "Error: Certificate does not include required SANs: kilo.clinic.com.hk, clinic.com.hk" | Exit 1, cleanup |
| Validity verification fails | "Error: Certificate validity is not 30 years" | Exit 1, cleanup |
| Key size verification fails | "Error: Certificate key size is not RSA 4096" | Exit 1, cleanup |

### Success Output

```text
✓ Self-signed certificate generated successfully
  Certificate: certs/clinic.com.hk.crt
  Private Key: certs/clinic.com.hk.key
  Domains: kilo.clinic.com.hk, clinic.com.hk
  Validity: 30 years
  Key: RSA 4096-bit
```
