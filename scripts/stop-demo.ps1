# Stop script for Smart Maintenance Request & Escalation System (SMRES)
# Run from repository root: powershell -ExecutionPolicy Bypass -File scripts/stop-demo.ps1

Write-Host "Stopping SMRES backend and frontend services..." -ForegroundColor Yellow

$ports = @(8000, 5173)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            Write-Host "Stopping process $pidToKill on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "Port $port is already clear." -ForegroundColor Green
    }
}

Write-Host "[OK] All SMRES application services stopped." -ForegroundColor Green
