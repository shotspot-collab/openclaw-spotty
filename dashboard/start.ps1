# ════════════════════════════════════════════════════════════════════════════
#  Spotty Dashboard — Startup Script
#  Starts the workspace file server (4445) and dashboard server (4444),
#  then opens the browser.
#
#  Usage:
#    .\start.ps1               # Normal start + open browser
#    .\start.ps1 -NoBrowser    # Start servers only, no browser
#    .\start.ps1 -Stop         # Kill any running servers on 4444/4445
# ════════════════════════════════════════════════════════════════════════════
param(
    [switch]$NoBrowser,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PORT_DASH = 4444
$PORT_FILE = 4445

function Write-Step  { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }

function Stop-Port {
    param([int]$Port)
    $pids = netstat -ano 2>$null |
        Select-String ":$Port\s+.*LISTENING" |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Where-Object { $_ -match '^\d+$' } |
        Select-Object -Unique
    foreach ($p in $pids) {
        try {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
            Write-Host "    Killed PID $p on port $Port" -ForegroundColor DarkGray
        } catch { }
    }
}

function Probe-Port {
    param([int]$Port, [string]$Path = '/')
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port$Path" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return $r.StatusCode -lt 400
    } catch {
        return $false
    }
}

# ─── Banner ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  🐾 Spotty Dashboard" -ForegroundColor White
Write-Host "  ══════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# ─── Stop mode ───────────────────────────────────────────────────────────
if ($Stop) {
    Write-Step "Stopping servers on ports $PORT_DASH and $PORT_FILE..."
    Stop-Port $PORT_DASH
    Stop-Port $PORT_FILE
    Write-OK "Done."
    exit 0
}

# ─── Check Node.js ────────────────────────────────────────────────────────
try {
    $nodeVer = (node --version 2>&1).ToString().Trim()
    Write-Host "  Node: $nodeVer" -ForegroundColor DarkGray
} catch {
    Write-Fail "Node.js not found on PATH. Please install Node.js (https://nodejs.org)."
    exit 1
}

# ─── Check openclaw CLI ───────────────────────────────────────────────────
try {
    $ocVer = (openclaw --version 2>&1).ToString().Trim()
    Write-Host "  openclaw: $ocVer" -ForegroundColor DarkGray
} catch {
    Write-Warn "openclaw CLI not found on PATH — subagent panel will show errors."
    Write-Host "    (Install: npm i -g openclaw)" -ForegroundColor DarkGray
}

Write-Host ""

# ─── Kill existing servers ────────────────────────────────────────────────
Write-Step "Clearing ports $PORT_DASH and $PORT_FILE..."
Stop-Port $PORT_DASH
Stop-Port $PORT_FILE
Start-Sleep -Milliseconds 400

# ─── Start file server ────────────────────────────────────────────────────
Write-Step "Starting workspace file server on port $PORT_FILE..."
$fileLog    = Join-Path $ScriptDir 'file-server.log'
$fileErrLog = Join-Path $ScriptDir 'file-server-err.log'
$fileProc   = Start-Process `
    -FilePath 'node' `
    -ArgumentList (Join-Path $ScriptDir 'file-server.js') `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput  $fileLog `
    -RedirectStandardError   $fileErrLog
Write-Host "    PID $($fileProc.Id) · log: $fileLog" -ForegroundColor DarkGray

# ─── Start dashboard server ───────────────────────────────────────────────
Write-Step "Starting dashboard server on port $PORT_DASH..."
$dashLog    = Join-Path $ScriptDir 'dashboard.log'
$dashErrLog = Join-Path $ScriptDir 'dashboard-err.log'
$dashProc   = Start-Process `
    -FilePath 'node' `
    -ArgumentList (Join-Path $ScriptDir 'dashboard-server.js') `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput  $dashLog `
    -RedirectStandardError   $dashErrLog
Write-Host "    PID $($dashProc.Id) · log: $dashLog" -ForegroundColor DarkGray

# ─── Wait for bind ────────────────────────────────────────────────────────
Write-Host ""
Write-Step "Waiting for servers to bind..."
Start-Sleep -Milliseconds 1000

# ─── Probe ────────────────────────────────────────────────────────────────
if (Probe-Port $PORT_FILE '/tree') {
    Write-OK "File server OK  → http://127.0.0.1:$PORT_FILE"
} else {
    Write-Warn "File server not responding yet. Check: $fileErrLog"
}

if (Probe-Port $PORT_DASH '/') {
    Write-OK "Dashboard OK    → http://localhost:$PORT_DASH"
} else {
    Write-Warn "Dashboard server not responding yet. Check: $dashErrLog"
}

# ─── Summary ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ══════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  Dashboard  http://localhost:$PORT_DASH" -ForegroundColor White
Write-Host "  File API   http://127.0.0.1:$PORT_FILE" -ForegroundColor DarkGray
Write-Host "  Gateway    ws://127.0.0.1:18789" -ForegroundColor DarkGray
Write-Host "  ══════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# ─── Open browser ─────────────────────────────────────────────────────────
if (-not $NoBrowser) {
    Start-Sleep -Milliseconds 300
    Write-Host "  Opening browser..." -ForegroundColor DarkGray
    Start-Process "http://localhost:$PORT_DASH"
}

# ─── Wait for Ctrl+C ──────────────────────────────────────────────────────
Write-Host "  Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

try {
    # Keep alive until Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 5
        # Restart if crashed
        if ($fileProc.HasExited) {
            Write-Warn "File server crashed (exit $($fileProc.ExitCode)). Restarting..."
            $fileProc = Start-Process `
                -FilePath 'node' `
                -ArgumentList (Join-Path $ScriptDir 'file-server.js') `
                -PassThru -WindowStyle Hidden `
                -RedirectStandardOutput  $fileLog `
                -RedirectStandardError   $fileErrLog
        }
        if ($dashProc.HasExited) {
            Write-Warn "Dashboard server crashed (exit $($dashProc.ExitCode)). Restarting..."
            $dashProc = Start-Process `
                -FilePath 'node' `
                -ArgumentList (Join-Path $ScriptDir 'dashboard-server.js') `
                -PassThru -WindowStyle Hidden `
                -RedirectStandardOutput  $dashLog `
                -RedirectStandardError   $dashErrLog
        }
    }
} finally {
    Write-Host ""
    Write-Host "  Stopping servers..." -ForegroundColor Yellow
    try { Stop-Process -Id $dashProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $fileProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "  Stopped. Goodbye 🐾" -ForegroundColor Cyan
    Write-Host ""
}
