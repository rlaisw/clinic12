#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CERT_DIR="$SCRIPT_DIR"
CERT_FILE="$CERT_DIR/clinic.com.hk.crt"
KEY_FILE="$CERT_DIR/clinic.com.hk.key"
CONFIG_FILE="$CERT_DIR/openssl.cnf"

# Error handling: Check for openssl availability
if ! command -v openssl &>/dev/null; then
  echo "Error: openssl is not installed. Please install openssl and retry." >&2
  exit 1
fi

# Error handling: Ensure certs directory exists
if [ ! -d "$CERT_DIR" ]; then
  echo "Error: certs/ directory does not exist at $CERT_DIR" >&2
  exit 1
fi

# Error handling: Ensure openssl.cnf exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: OpenSSL config file not found at $CONFIG_FILE" >&2
  exit 1
fi

# Generate the self-signed certificate (RSA 4096, 30 years = 10950 days)
echo "Generating self-signed certificate (RSA 4096, 30 years)..."

if ! openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days 10950 \
  -config "$CONFIG_FILE" \
  -sha256 2>/dev/null; then
  echo "Error: Certificate generation failed." >&2
  # Clean up partial files
  rm -f "$CERT_FILE" "$KEY_FILE"
  exit 1
fi

# Validate: Certificate file exists
if [ ! -f "$CERT_FILE" ] || [ ! -s "$CERT_FILE" ]; then
  echo "Error: Certificate file not created or empty." >&2
  rm -f "$KEY_FILE"
  exit 1
fi

# Validate: Key file exists
if [ ! -f "$KEY_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  echo "Error: Key file not created or empty." >&2
  rm -f "$CERT_FILE"
  exit 1
fi

# Validate: SANs include required domains
if ! openssl x509 -noout -ext subjectAltName -in "$CERT_FILE" 2>/dev/null | grep -q "kilo.clinic.com.hk"; then
  echo "Error: Certificate does not include required SAN: kilo.clinic.com.hk" >&2
  rm -f "$CERT_FILE" "$KEY_FILE"
  exit 1
fi

if ! openssl x509 -noout -ext subjectAltName -in "$CERT_FILE" 2>/dev/null | grep -q "clinic.com.hk"; then
  echo "Error: Certificate does not include required SAN: clinic.com.hk" >&2
  rm -f "$CERT_FILE" "$KEY_FILE"
  exit 1
fi

# Validate: Key size is RSA 4096
if ! openssl x509 -noout -text -in "$CERT_FILE" 2>/dev/null | grep -q "Public-Key: (4096 bit)"; then
  echo "Error: Certificate key size is not RSA 4096-bit." >&2
  rm -f "$CERT_FILE" "$KEY_FILE"
  exit 1
fi

echo "✓ Self-signed certificate generated successfully"
echo "  Certificate: $CERT_FILE"
echo "  Private Key: $KEY_FILE"
echo "  Domains: kilo.clinic.com.hk, clinic.com.hk"
echo "  Validity: 30 years"
echo "  Key: RSA 4096-bit"
