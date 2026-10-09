# Setup script for Smart Maintenance Request & Escalation System (SMRES)
# Run from repository root: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SMRES - Full-Stack Setup & Database Migration Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

# 1. Check Python
Write-Host "`n[1/5] Checking Python environment..." -ForegroundColor Yellow
$PythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python is not found in PATH. Please install Python 3.10+."
    exit 1
}
Write-Host "Found: $PythonVersion" -ForegroundColor Green

# 2. Install Backend Dependencies
Write-Host "`n[2/5] Installing Backend dependencies..." -ForegroundColor Yellow
python -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install backend requirements."
    exit 1
}

# 3. Install Frontend Dependencies
Write-Host "`n[3/5] Installing Frontend dependencies..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install frontend node modules."
    exit 1
}
Set-Location $RootDir

# 4. Run Alembic Database Migrations on PostgreSQL
Write-Host "`n[4/5] Applying PostgreSQL migrations..." -ForegroundColor Yellow
Set-Location "$RootDir\backend"
alembic upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Error "Alembic migration failed. Ensure PostgreSQL is running on port 5433."
    exit 1
}
Set-Location $RootDir

# 5. Deterministic Demo Seeding
Write-Host "`n[5/5] Seeding deterministic demo data..." -ForegroundColor Yellow
python scripts/seed_demo.py
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database seeding failed."
    exit 1
}

Write-Host "`n[SUCCESS] Setup and database initialization complete!" -ForegroundColor Green
Write-Host "Start the demo anytime using: .\scripts\start-demo.ps1`n" -ForegroundColor Cyan
