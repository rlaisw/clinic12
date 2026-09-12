#!/bin/bash
set -e

# Add pnpm and node to PATH
export PATH="/home/ubuntu/.local/bin:$PATH"
export HF_TOKEN="${HF_TOKEN:-}"

PROJECT_NAME="clinic12"
BASE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$BASE_PATH/apps/web"
BACKEND_DIR="$BASE_PATH/backend"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "[ERR] Frontend directory not found: $FRONTEND_DIR"
    echo "       Please ensure you are in the correct base directory."
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo "[ERR] Backend directory not found: $BACKEND_DIR"
    echo "       Please ensure you are in the correct base directory."
    exit 1
fi

echo ""
echo "========================================"
echo "  Dev Environment Launcher"
echo "  Project: $PROJECT_NAME"
echo "========================================"
echo ""

# --- Helper: Kill process by port ---
kill_port() {
    local port=$1
    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local pids=""
        # Try multiple methods to find processes on the port
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -z "$pids" ]; then
            pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oE 'pid=[0-9]+' | cut -d= -f2 || true)
        fi
        if [ -z "$pids" ]; then
            pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d/ -f1 || true)
        fi

        if [ -n "$pids" ]; then
            for pid in $pids; do
                local proc_name=$(ps -p $pid -o comm= 2>/dev/null)
                echo "[WARN] Port $port is in use by $proc_name (PID $pid). Stopping it..."
                kill -9 "$pid" 2>/dev/null || true
            done
            sleep 2
        else
            # Port is free, verify it's actually free by trying to bind
            if python3 -c "import socket; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('', $port)); s.close()" 2>/dev/null; then
                break
            else
                echo "[WARN] Port $port appears free but bind failed, waiting..."
            fi
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
}

# --- Helper: Log functions ---
log_info() { echo "[INFO] $*"; }
log_ok()   { echo "[OK]   $*"; }
log_warn() { echo "[WARN] $*"; }
log_err()  { echo "[ERR]  $*" >&2; }

# --- Ensure ports are free ---
echo "[INFO] Checking port availability..."
kill_port 8000
kill_port 3001

# Verify ports are actually free
for port in 8000 3001; do
    while python3 -c "import socket; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('', $port)); s.close()" 2>/dev/null; [ $? -ne 0 ]; do
        echo "[WARN] Port $port still in use, waiting..."
        sleep 2
    done
    echo "[INFO] Port $port is free"
done

# --- Clean stale Next.js dev state ---
if [ -d "$FRONTEND_DIR/.next/dev" ]; then
    log_warn "Removing stale .next/dev lock..."
    rm -rf "$FRONTEND_DIR/.next/dev"
fi

# --- Start Backend ---
log_info "Starting Django Backend on https://kilo.clinic.com.hk:8000 ..."
cd "$BACKEND_DIR"
export FRONTEND_BASE_URL="https://kilo.clinic.com.hk"
export DJANGO_SETTINGS_MODULE="config.settings"

CERT_FILE="$BASE_PATH/certs/clinic.com.hk.crt"
KEY_FILE="$BASE_PATH/certs/clinic.com.hk.key"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    log_err "SSL certificate or key not found. Run: bash certs/generate.sh"
    exit 1
fi

VENV_PYTHON="$BACKEND_DIR/venv/bin/python"
if [ ! -x "$VENV_PYTHON" ]; then
    log_err "Backend venv not found at $VENV_PYTHON"
    exit 1
fi
"$VENV_PYTHON" manage.py runserver_plus --help >/dev/null 2>&1 || {
    log_err "django-extensions is required for HTTPS backend. Install: $VENV_PYTHON -m pip install django-extensions Werkzeug pyOpenSSL"
    exit 1
}
"$VENV_PYTHON" manage.py runserver_plus 0.0.0.0:8000 --cert "$CERT_FILE" --key "$KEY_FILE" &
BACKEND_PID=$!

sleep 3

if curl -k -s -f https://kilo.clinic.com.hk:8000/ >/dev/null 2>&1; then
    log_ok "Backend is running at https://kilo.clinic.com.hk:8000"
else
    log_warn "Backend may still be starting..."
fi

# --- Start Frontend ---
log_info "Starting Next.js Frontend on https://kilo.clinic.com.hk:3001 ..."
cd "$FRONTEND_DIR"
pnpm dev &
FRONTEND_PID=$!

sleep 5

if curl -k -s -f https://kilo.clinic.com.hk:3001/login >/dev/null 2>&1; then
    log_ok "Frontend is running at https://kilo.clinic.com.hk:3001"
else
    log_warn "Frontend may still be starting..."
fi

echo ""
echo "========================================"
echo "  BOTH SERVICES STARTED!"
echo "========================================"
echo "  Frontend: https://kilo.clinic.com.hk:3001"
echo "  Backend:  https://kilo.clinic.com.hk:8000"
echo "  Admin:    https://kilo.clinic.com.hk:8000/admin/"
echo "  API:      https://kilo.clinic.com.hk:8000/api/token/"
echo ""
echo "Press [Ctrl+C] to stop both services."
echo ""

cleanup() {
    echo ""
    log_info "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    log_ok "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
