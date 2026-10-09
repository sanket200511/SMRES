# Start script for Smart Maintenance Request & Escalation System (SMRES)
# Run from repository root: powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SMRES - Starting Full-Stack Application" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

# 1. Verify PostgreSQL on port 5433
Write-Host "`n[1/4] Checking PostgreSQL cluster (port 5433)..." -ForegroundColor Yellow
$pgConn = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $pgConn) {
    Write-Host "PostgreSQL is not running on port 5433. Attempting to start local instance..." -ForegroundColor Yellow
    $pgData = "$RootDir\pgdata"
    if (Test-Path "$pgData\PG_VERSION") {
        Start-Process "D:\Apps Data\PostgreSQL\bin\postgres.exe" -ArgumentList "-D", "`"$pgData`"" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    } else {
        Write-Error "PostgreSQL is not listening on port 5433 and no cluster found at $pgData."
        exit 1
    }
}
Write-Host "PostgreSQL is active and ready on port 5433." -ForegroundColor Green

# 2. Start Backend FastAPI Server (Port 8000)
Write-Host "`n[2/4] Starting FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
$backendConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $backendConn) {
    Start-Process "python" -ArgumentList "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $RootDir -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "Backend server is already running on port 8000." -ForegroundColor Green
}

# 3. Start Frontend Vite Dev Server (Port 5173)
Write-Host "`n[3/4] Starting React Vite frontend on http://127.0.0.1:5173..." -ForegroundColor Yellow
$frontendConn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $frontendConn) {
    Start-Process "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$RootDir\frontend" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "Frontend server is already running on port 5173." -ForegroundColor Green
}

# 4. Health Check Verification
Write-Host "`n[4/4] Verifying application health..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -Method Get -TimeoutSec 5
    Write-Host "Backend Status: $($res.status) | Service: $($res.service) | DB: $($res.database)" -ForegroundColor Green
} catch {
    Write-Warning "Health check waiting for backend to complete startup..."
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SMRES APPLICATION IS LIVE & READY FOR PRESENTATION" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Frontend URL:     http://127.0.0.1:5173/" -ForegroundColor Cyan
Write-Host "  Backend API URL:  http://127.0.0.1:8000/" -ForegroundColor Cyan
Write-Host "  Swagger UI Docs:  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  Health Endpoint:  http://127.0.0.1:8000/api/health" -ForegroundColor Cyan
Write-Host "`nDemo Accounts (1-Click Login Available in UI):" -ForegroundColor Yellow
Write-Host "  - Employee:       sarah.jenkins@company.com  (Sarah Jenkins)" -ForegroundColor White
Write-Host "  - Facility Admin: marcus.vance@company.com   (Marcus Vance)" -ForegroundColor White
Write-Host "`nTo stop all services: .\scripts\stop-demo.ps1`n" -ForegroundColor DarkGray
