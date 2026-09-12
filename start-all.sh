#!/bin/bash
# Clinic12 - Full startup: backend + frontend + Tailscale funnel
set -e
BASE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_PATH"

echo "========================================"
echo "  Clinic12 - Full Startup"
echo "========================================"

# 1. Start Django backend (HTTPS :8000)
if ! curl -sk -o /dev/null https://127.0.0.1:8000/ 2>/dev/null; then
    echo "[INFO] Starting Django backend on :8000 ..."
    cd "$BASE_PATH/backend"
    setsid nohup venv/bin/python manage.py runserver_plus 0.0.0.0:8000 \
        --cert "$BASE_PATH/certs/clinic.com.hk.crt" \
        --key  "$BASE_PATH/certs/clinic.com.hk.key" > /tmp/backend.log 2>&1 &
    sleep 4
else
    echo "[OK]   Backend already running on :8000"
fi

# 2. Start Next.js frontend (HTTP :3001 — TLS handled by Tailscale funnel)
if ! curl -s -o /dev/null http://127.0.0.1:3001/login 2>/dev/null; then
    echo "[INFO] Starting Next.js frontend on :3001 (HTTP) ..."
    cd "$BASE_PATH/apps/web"
    setsid nohup node server.js > /tmp/frontend.log 2>&1 &
    sleep 6
else
    echo "[OK]   Frontend already running on :3001"
fi

# 3. Start Tailscale funnel (persistent, background)
if ! tailscale funnel status 2>/dev/null | grep -q "vps.tailb5775.ts.net"; then
    echo "[INFO] Starting Tailscale funnel ..."
    cd "$BASE_PATH"
    tailscale funnel --bg http://127.0.0.1:3001
else
    echo "[OK]   Funnel already running"
fi

# 4. Verify
echo ""
echo "=== Status ==="
curl -s -o /dev/null -w "Frontend (local):   %{http_code}\n" http://127.0.0.1:3001/login
curl -sk -o /dev/null -w "Backend  (local):   %{http_code}\n" https://127.0.0.1:8000/
curl -sk -o /dev/null -w "Funnel   (public):  %{http_code}\n" https://vps.tailb5775.ts.net/login

echo ""
echo "========================================"
echo "  ALL SERVICES STARTED"
echo "========================================"
echo "  Internet: https://vps.tailb5775.ts.net"
echo "  Local:    http://localhost:3001"
echo "  Backend:  https://kilo.clinic.com.hk:8000"
echo "  Login:    admin/admin-5d0f6e | doctor/doctor1997"
echo "            nurse01/nurse-3b1e9d | nurse02/nurse-3b1e9d"
