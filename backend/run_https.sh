#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_FILE="$SCRIPT_DIR/../certs/clinic.com.hk.crt"
KEY_FILE="$SCRIPT_DIR/../certs/clinic.com.hk.key"
PORT="${1:-8000}"

# Error handling: Check for certificate file
if [ ! -f "$CERT_FILE" ]; then
  echo "Error: Certificate file not found at $CERT_FILE" >&2
  echo "Run: bash certs/generate.sh" >&2
  exit 1
fi

# Error handling: Check for key file
if [ ! -f "$KEY_FILE" ]; then
  echo "Error: Key file not found at $KEY_FILE" >&2
  echo "Run: bash certs/generate.sh" >&2
  exit 1
fi

# Error handling: Check if django-extensions is installed
if ! python3 -c "import django_extensions" 2>/dev/null; then
  echo "Error: django-extensions is not installed." >&2
  echo "Run: pip install django-extensions" >&2
  exit 1
fi

# Error handling: Check if port is in use
if ss -tlnp 2>/dev/null | grep -q ":$PORT " || netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
  echo "Error: Port $PORT is already in use." >&2
  echo "Stop the conflicting process or specify a different port: bash backend/run_https.sh <PORT>" >&2
  exit 1
fi

echo "Starting Django backend over HTTPS on port $PORT..."
echo "  Certificate: $CERT_FILE"
echo "  Key: $KEY_FILE"
python3 "$SCRIPT_DIR/manage.py" runserver_plus "0.0.0.0:$PORT" \
  --cert "$CERT_FILE" \
  --key "$KEY_FILE" \
  --suppress-requests
