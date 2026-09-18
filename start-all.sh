#!/bin/bash
# Clinic12 - Full startup: backend + frontend + Tailscale funnel
#
# Usage:
#   ./start-all.sh                       foreground: attached logs, Ctrl+C stops all
#   ./start-all.sh background|--bg       daemonize backend+frontend, logs to /tmp
#   ./start-all.sh stop|-s               stop background services + funnel
#   ./start-all.sh restart|-r            restart background services + funnel
#   ./start-all.sh status|st             show status of all services
set -e

# Add pnpm and node to PATH
export PATH="/home/ubuntu/.local/bin:$PATH"
export HF_TOKEN="${HF_TOKEN:-}"

BASE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_PATH"

FRONTEND_DIR="$BASE_PATH/apps/web"
BACKEND_DIR="$BASE_PATH/backend"
CERT_FILE="$BASE_PATH/certs/clinic.com.hk.crt"
KEY_FILE="$BASE_PATH/certs/clinic.com.hk.key"

FUNNEL_TARGET="vps.tailb5775.ts.net"

PID_DIR="/tmp/clinic12"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_LOG="/tmp/clinic12-backend.log"
FRONTEND_LOG="/tmp/clinic12-frontend.log"

log_info() { echo "[INFO] $*"; }
log_ok()   { echo "[OK]   $*"; }
log_warn() { echo "[WARN] $*"; }
log_err()  { echo "[ERR]  $*" >&2; }

# --- Sanity checks ---
if [ ! -d "$FRONTEND_DIR" ]; then log_err "Frontend dir not found: $FRONTEND_DIR"; exit 1; fi
if [ ! -d "$BACKEND_DIR" ]; then log_err "Backend dir not found: $BACKEND_DIR"; exit 1; fi
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    log_err "SSL cert/key missing. Run: bash certs/generate.sh"; exit 1
fi
if [ ! -x "$BACKEND_DIR/venv/bin/python" ]; then
    log_err "Backend venv not found at $BACKEND_DIR/venv/bin/python"; exit 1
fi

pid_alive() { # $1=pidfile
    [ -f "$1" ] || return 1
    local pid; pid=$(cat "$1" 2>/dev/null) || return 1
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

stop_apps() {
    local f pid
    for f in "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"; do
        if pid_alive "$f"; then
            pid=$(cat "$f")
            log_info "Stopping $(basename "$f" .pid) (PID $pid)..."
            # kill the whole process group (setsid makes each service a leader)
            kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
            for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
            kill -9 -- "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$f"
    done
    # Fallback: clear anything left on the app ports (untracked/leftover).
    for port in 8000 3001; do
        local leftovers
        leftovers=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$leftovers" ]; then
            log_info "Clearing leftover process(es) $leftovers on port $port ..."
            for p in $leftovers; do kill -9 "$p" 2>/dev/null || true; done
            sleep 1
        fi
    done
}

funnel_active() {
    command -v tailscale >/dev/null 2>&1 && tailscale funnel status 2>/dev/null | grep -q "$FUNNEL_TARGET"
}

ensure_funnel() {
    if funnel_active; then
        log_ok "Funnel already running: https://$FUNNEL_TARGET"
    elif command -v tailscale >/dev/null 2>&1; then
        log_info "Starting Tailscale funnel https+insecure://127.0.0.1:3001 ..."
        tailscale funnel --bg "https+insecure://127.0.0.1:3001"
        sleep 2
        funnel_active && log_ok "Funnel running: https://$FUNNEL_TARGET" || log_warn "Funnel did not come up yet."
    else
        log_warn "tailscale not found; skipping funnel."
    fi
}

stop_funnel() {
    if funnel_active && command -v tailscale >/dev/null 2>&1; then
        log_info "Stopping Tailscale funnel ..."
        tailscale funnel reset 2>/dev/null || log_warn "tailscale funnel reset failed (ignored)."
    else
        log_ok "Funnel not running, nothing to stop."
    fi
}

verify() {
    curl -sk -o /dev/null -w "Frontend (local):   %{http_code}\n" https://127.0.0.1:3001/login
    curl -sk -o /dev/null -w "Backend  (local):   %{http_code}\n" https://127.0.0.1:8000/
    curl -sk -o /dev/null -w "Funnel   (public):  %{http_code}\n" "https://$FUNNEL_TARGET/login" || true
}

banner() {
    echo ""
    echo "========================================"
    echo "  ALL SERVICES STARTED"
    echo "========================================"
    echo "  Internet: https://$FUNNEL_TARGET"
    echo "  Frontend: https://$FUNNEL_TARGET:3001"
    echo "  Backend:  https://$FUNNEL_TARGET:8000"
    echo "  Login:    admin/admin-5d0f6e | doctor/doctor1997"
    echo "            nurse01/nurse-3b1e9d | nurse02/nurse-3b1e9d"
}

# ============================================================
# 1. FOREGROUND  (default) - Ctrl+C stops backend + frontend
# ============================================================
foreground_mode() {
    if pid_alive "$BACKEND_PID_FILE" || pid_alive "$FRONTEND_PID_FILE"; then
        log_warn "Background services are already running. Stop them first: ./start-all.sh stop"
        exit 1
    fi
    ensure_funnel
    banner
    log_info "Starting attached (Ctrl+C stops all)..."
    # start-dev.sh owns the foreground lifecycle: health checks, Ctrl+C cleanup.
    exec bash start-dev.sh
}

# ============================================================
# 2. BACKGROUND - daemonize backend + frontend
# ============================================================
wait_ready() { # $1=url  $2=name  $3=timeout_sec  $4=logfile
    local url="$1" name="$2" timeout="$3" log="$4" i
    for i in $(seq 1 "$timeout"); do
        if curl -sk -f "$url" >/dev/null 2>&1; then
            log_ok "$name ready ($url)"
            return 0
        fi
        sleep 1
    done
    log_err "$name failed to start within ${timeout}s. Last lines of $log:"
    tail -n 15 "$log" 2>/dev/null
    return 1
}

background_mode() {
    stop_apps
    mkdir -p "$PID_DIR"

    log_info "Starting Django Backend on :8000 ..."
    cd "$BACKEND_DIR"
    export FRONTEND_BASE_URL="https://$FUNNEL_TARGET"
    export DJANGO_SETTINGS_MODULE="config.settings"
    setsid nohup venv/bin/python manage.py runserver_plus 0.0.0.0:8000 \
        --cert "$CERT_FILE" --key "$KEY_FILE" >>"$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"

    log_info "Starting Next.js Frontend on :3001 ..."
    cd "$FRONTEND_DIR"
    setsid nohup node server.js >>"$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"

    wait_ready "https://127.0.0.1:8000/" "Backend" 40 "$BACKEND_LOG" || exit 1
    wait_ready "https://127.0.0.1:3001/login" "Frontend" 40 "$FRONTEND_LOG" || exit 1

    # Pre-warm the heavy routes. Next.js dev compiles each route on first hit;
    # a cold compile through the funnel can exceed its origin timeout and
    # surface as a 502 to the first visitor. Warming here (before the funnel
    # is exposed) moves that cost out of the public window.
    log_info "Pre-warming routes (first-visit compile)..."
    for u in "/login" "/" "/doctor/patients/17/ai-chatbot"; do
        curl -sk -o /dev/null --max-time 90 "https://127.0.0.1:3001$u" || true
    done

    # Funnel last: bringing it up while the frontend is still starting would
    # make the public URL return 502 for the (several-second) gap.
    ensure_funnel

    # Confirm the public URL is actually serving before declaring done.
    if curl -sk -o /dev/null --max-time 20 "https://$FUNNEL_TARGET/login" 2>/dev/null; then
        log_ok "Public URL serving: https://$FUNNEL_TARGET"
    else
        log_warn "Public URL not responding yet; check: tailscale funnel status"
    fi

    log_ok "Backend running  (PID $(cat "$BACKEND_PID_FILE"), log $BACKEND_LOG)"
    log_ok "Frontend running (PID $(cat "$FRONTEND_PID_FILE"), log $FRONTEND_LOG)"
    banner
    verify
    echo ""
    log_info "Manage with: ./start-all.sh {status|stop|restart}"
}

# ============================================================
# 3. STOP / RESTART / STATUS
# ============================================================
stop_mode() {
    stop_apps
    stop_funnel
    log_ok "All services stopped."
}

restart_mode() {
    stop_apps
    stop_funnel
    echo ""
    background_mode
}

status_mode() {
    if pid_alive "$BACKEND_PID_FILE"; then
        log_ok "Backend  running (PID $(cat "$BACKEND_PID_FILE"))"
        curl -sk -o /dev/null -w "         https://127.0.0.1:8000/ -> %{http_code}\n" https://127.0.0.1:8000/
    else
        log_warn "Backend  not running"
    fi
    if pid_alive "$FRONTEND_PID_FILE"; then
        log_ok "Frontend running (PID $(cat "$FRONTEND_PID_FILE"))"
        curl -sk -o /dev/null -w "         https://127.0.0.1:3001/login -> %{http_code}\n" https://127.0.0.1:3001/login
    else
        log_warn "Frontend not running"
    fi
    if funnel_active; then
        log_ok "Funnel   running: https://$FUNNEL_TARGET"
        curl -sk -o /dev/null -w "         https://$FUNNEL_TARGET/login -> %{http_code}\n" "https://$FUNNEL_TARGET/login" || true
    else
        log_warn "Funnel   not running"
    fi
}

# ============================================================
cmd="${1:-fg}"
case "$cmd" in
    fg|foreground|--fg|--foreground|--dev)    foreground_mode ;;
    bg|background|--bg|--background|-b)       background_mode ;;
    stop|--stop|-s)                           stop_mode ;;
    restart|--restart|-r)                     restart_mode ;;
    status|st|--status)                       status_mode ;;
    -h|--help|help)                            sed -n '2,10p' "$0" ;;
    *) log_err "Unknown command: $cmd"; sed -n '2,10p' "$0"; exit 1 ;;
esac