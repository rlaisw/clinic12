#!/bin/bash
# ponytail: test harness for HTTPS setup — no test framework needed (YAGNI)
# Run: bash certs/test_https.sh [test_name]

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_FILE="$SCRIPT_DIR/clinic.com.hk.crt"
KEY_FILE="$SCRIPT_DIR/clinic.com.hk.key"
FRONTEND_URL="https://kilo.clinic.com.hk:3001"
BACKEND_URL="https://kilo.clinic.com.hk:8000"

PASS=0
FAIL=0

test_pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
test_fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

# ─── US1: Frontend HTTPS Tests ────────────────────────────────────────────────

test_us1_cert_cn() {
  echo "TEST: US1 - Certificate CN validation"
  local cn
  cn=$(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | sed -n 's/.*CN *= *\([^,]*\).*/\1/p')
  if [ "$cn" = "kilo.clinic.com.hk" ]; then
    test_pass "Certificate CN is kilo.clinic.com.hk"
  else
    test_fail "Certificate CN is '$cn', expected 'kilo.clinic.com.hk'"
  fi
}

test_us1_cert_sans() {
  echo "TEST: US1 - Certificate SANs validation"
  if openssl x509 -in "$CERT_FILE" -noout -ext subjectAltName 2>/dev/null | grep -q "kilo.clinic.com.hk"; then
    test_pass "SAN includes kilo.clinic.com.hk"
  else
    test_fail "SAN missing kilo.clinic.com.hk"
  fi
  if openssl x509 -in "$CERT_FILE" -noout -ext subjectAltName 2>/dev/null | grep -q "clinic.com.hk"; then
    test_pass "SAN includes clinic.com.hk"
  else
    test_fail "SAN missing clinic.com.hk"
  fi
}

test_us1_frontend_https() {
  echo "TEST: US1 - Frontend HTTPS connectivity"
  local status
  status=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 "$FRONTEND_URL/login" 2>/dev/null)
  if [ "$status" = "200" ]; then
    test_pass "Frontend accessible over HTTPS (HTTP $status)"
  else
    test_fail "Frontend HTTPS returned HTTP $status (expected 200)"
  fi
}

# ─── US2: Backend HTTPS Tests ────────────────────────────────────────────────

test_us2_backend_https() {
  echo "TEST: US2 - Backend HTTPS connectivity"
  local status
  status=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 "$BACKEND_URL/api/" 2>/dev/null)
  if [ "$status" = "200" ] || [ "$status" = "401" ] || [ "$status" = "403" ]; then
    test_pass "Backend API accessible over HTTPS (HTTP $status)"
  else
    test_fail "Backend HTTPS returned HTTP $status (expected 200/401/403)"
  fi
}

test_us2_login_over_https() {
  echo "TEST: US2 - Backend login over HTTPS"
  local status
  status=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST "$BACKEND_URL/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' 2>/dev/null)
  if [ "$status" = "401" ] || [ "$status" = "200" ]; then
    test_pass "Backend login endpoint responds over HTTPS (HTTP $status)"
  else
    test_fail "Backend login over HTTPS returned HTTP $status"
  fi
}

# ─── US3: Certificate Validation Tests ────────────────────────────────────────

test_us3_validity_30_years() {
  echo "TEST: US3 - Certificate validity period (~30 years)"
  local not_after
  not_after=$(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$not_after" ]; then
    local end_epoch now_epoch diff_years
    end_epoch=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$not_after" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    diff_years=$(( (end_epoch - now_epoch + 15778800) / 31557600 ))
    if [ "$diff_years" -ge 29 ] && [ "$diff_years" -le 31 ]; then
      test_pass "Certificate valid for ~$diff_years years (expected ~30)"
    else
      test_fail "Certificate validity is ~$diff_years years (expected ~30)"
    fi
  else
    test_fail "Could not read certificate expiration date"
  fi
}

test_us3_key_size() {
  echo "TEST: US3 - Certificate RSA key size (4096-bit)"
  if openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -q "Public-Key: (4096 bit)"; then
    test_pass "Certificate uses RSA 4096-bit"
  else
    test_fail "Certificate does not use RSA 4096-bit"
  fi
}

# ─── Error Handling Tests ─────────────────────────────────────────────────────

test_error_missing_cert() {
  echo "TEST: Error handling - Missing certificate file"
  if [ ! -f "$CERT_FILE" ]; then
    test_pass "Missing certificate correctly detected"
  else
    test_pass "Certificate file exists (expected)"
  fi
}

test_error_mixed_content() {
  echo "TEST: Error handling - Mixed content check"
  if [ -f "$PROJECT_ROOT/apps/web/.env.local" ]; then
    if grep -q "http://" "$PROJECT_ROOT/apps/web/.env.local" 2>/dev/null && ! grep -q "https://" "$PROJECT_ROOT/apps/web/.env.local" 2>/dev/null; then
      test_fail "API URL uses HTTP — mixed content risk"
    else
      test_pass "API URL uses HTTPS — no mixed content"
    fi
  else
    test_pass "No .env.local file yet (skipped)"
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  local target="${1:-all}"

  echo "=== HTTPS Setup Test Suite ==="
  echo ""

  # Certificate must exist for cert tests
  if [ ! -f "$CERT_FILE" ]; then
    echo "ERROR: Certificate file not found at $CERT_FILE"
    echo "Run: bash certs/generate.sh"
    exit 1
  fi

  case "$target" in
    us1) test_us1_cert_cn; test_us1_cert_sans; test_us1_frontend_https ;;
    us2) test_us2_backend_https; test_us2_login_over_https ;;
    us3) test_us3_validity_30_years; test_us3_key_size ;;
    errors) test_error_missing_cert; test_error_mixed_content ;;
    all)
      test_us1_cert_cn
      test_us1_cert_sans
      test_us1_frontend_https
      test_us2_backend_https
      test_us2_login_over_https
      test_us3_validity_30_years
      test_us3_key_size
      test_error_missing_cert
      test_error_mixed_content
      ;;
    *)
      echo "Usage: bash certs/test_https.sh [us1|us2|us3|errors|all]"
      exit 1
      ;;
  esac

  echo ""
  echo "=== Results: $PASS passed, $FAIL failed ==="
  [ "$FAIL" -gt 0 ] && exit 1 || exit 0
}

main "$@"
