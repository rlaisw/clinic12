# ============================================================
# Start Dev Environment (Frontend + Backend)
# ============================================================

param (
    [Parameter(Mandatory=$true, HelpMessage="Enter the project name (e.g., clinic12)")]
    [string]$ProjectName
)

# Dynamically set paths based on the script location
$basePath = (Split-Path $PSScriptRoot)
$frontendDir = Join-Path $basePath $ProjectName
$backendDir = Join-Path $basePath "$ProjectName\backend"

# Verify directories exist before starting
if (-not (Test-Path $frontendDir)) {
    Write-Host "[ERR]  Frontend directory not found: $frontendDir" -ForegroundColor Red
    Write-Host "       Please ensure you are in the correct base directory." -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path $backendDir)) {
    Write-Host "[ERR]  Backend directory not found: $backendDir" -ForegroundColor Red
    Write-Host "       Please ensure you are in the correct base directory." -ForegroundColor Yellow
    exit 1
}

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERR]  $msg" -ForegroundColor Magenta}

#function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
#function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
#function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
#function Write-Err($msg)   { Write-Host "[ERR]  $msg" -ForegroundColor Magenta -BackgroundColor Yellow }


# --- Helper: Clean job output text ---
function Get-CleanLines($job) {
    $raw = Receive-Job -Job $job
    $lines = @()
    foreach ($item in $raw) {
        $text = $null
        if ($item -is [System.Management.Automation.ErrorRecord]) {
            $text = $item.TargetObject
            if (-not $text) { $text = $item.Exception.Message }
            if (-not $text) { $text = $item.ToString() }
        } elseif ($item -is [string]) {
            $text = $item
        } else {
            $text = $item.ToString()
        }
        if (-not $text) { continue }
        foreach ($line in $text -split "`r?`n") {
            $trimmed = $line.Trim()
            # Skip PowerShell metadata lines
            if ($trimmed -match "^\+\s*CategoryInfo\s*:") { continue }
            if ($trimmed -match "^\+\s*FullyQualifiedErrorId\s*:") { continue }
            if ($trimmed -match "^\+\s*PSComputerName\s*:") { continue }
            if ($trimmed -eq "RemoteException") { continue }
            if ($trimmed -match "^At line:\d+ char:\d+") { continue }
            if ($trimmed -match "^\+\s*~\s*$") { continue }
            if ($trimmed -match "^\+\s*~~*\s*$") { continue }
            # Remove emoji replacement artifacts
            $trimmed = $trimmed -replace "\?\?", ""
            $trimmed = $trimmed -replace "", ""
            if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
            $lines += $trimmed
        }
    }
    return $lines
}

# --- Helper: Kill process by port ---
function Stop-ProcessOnPort($port) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $seen = @{}
        foreach ($conn in $conns) {
            $procId = $conn.OwningProcess
            if ($seen.ContainsKey($procId)) { continue }
            $seen[$procId] = $true
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            $procName = if ($proc) { $proc.ProcessName } else { "unknown" }
            Write-Warn "Port $port is in use by $procName (PID $procId). Stopping it..."
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
}



Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dev Environment Launcher" -ForegroundColor Cyan
Write-Host "  Project: $ProjectName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Ensure ports are free ---
Stop-ProcessOnPort 8000
Stop-ProcessOnPort 3001

# --- Clean stale Next.js dev state ---
# A previous `next dev` killed without a clean shutdown leaves a lock in
# .next/dev pointing at a dead PID (often on a different port). The next
# `next dev` launch then aborts with "another next dev server is already
# running" and the frontend never starts -> route 404s. Kill any lingering
# next process and remove the stale lock so every restart is clean.
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = if ($_.CommandLine) { $_.CommandLine } else { '' }
    if ($cmd -match 'next' -or $cmd -match 'next-server') {
        Write-Warn "Stopping lingering Next process (PID $($_.ProcessId))..."
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1
$devLock = Join-Path $frontendDir ".next\dev"
if (Test-Path $devLock) {
    Write-Warn "Removing stale .next/dev lock..."
    Remove-Item -Recurse -Force $devLock
}

# --- Start Backend ---
Write-Info "Starting Django Backend on http://localhost:8000 ..."
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    $env:FRONTEND_BASE_URL = "https://vps.tailb5775.ts.net"
    $env:PATH = "$dir\venv\Scripts;$env:PATH"
    python manage.py runserver 0.0.0.0:8000 2>&1
} -ArgumentList $backendDir

Start-Sleep -Seconds 3

try {
    $health = Invoke-WebRequest -Uri http://localhost:8000/ -UseBasicParsing -TimeoutSec 5
    if ($health.StatusCode -eq 200) { Write-Ok "Backend is running at http://localhost:8000" }
} catch {
    Write-Warn "Backend may still be starting..."
}

# --- Start Frontend ---
Write-Info "Starting Next.js Frontend on http://localhost:3001 ..."
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    pnpm --filter web dev 2>&1
} -ArgumentList $frontendDir

Start-Sleep -Seconds 5

try {
    $health = Invoke-WebRequest -Uri http://localhost:3001/ -UseBasicParsing -TimeoutSec 5
    if ($health.StatusCode -eq 200) { Write-Ok "Frontend is running at http://localhost:3001" }
} catch {
    Write-Warn "Frontend may still be starting..."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BOTH SERVICES STARTED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000"  -ForegroundColor Cyan
Write-Host "  Admin:    http://localhost:8000/admin/" -ForegroundColor Cyan
Write-Host "  API:      http://localhost:8000/api/token/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press [Ctrl+C] to stop both services." -ForegroundColor Yellow
Write-Host ""

# --- Live Output Loop ---
try {
    while ($true) {
        $backendLines = Get-CleanLines $backendJob
        foreach ($line in $backendLines) {
            Write-Host "[BACKEND]  $line" -ForegroundColor Magenta
        }
        $frontendLines = Get-CleanLines $frontendJob
        foreach ($line in $frontendLines) {
            Write-Host "[FRONTEND] $line" -ForegroundColor Blue
        }
        if ($backendJob.State -eq "Failed") {
            Write-Err "Backend crashed!"
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Err "Frontend crashed!"
            break
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host ""
    Write-Info "Shutting down services..."
    Stop-Job -Job $backendJob  -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Write-Ok "All services stopped."
}
