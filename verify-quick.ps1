# Quick verification script for deployed system
Write-Host "Verifying system deployment..." -ForegroundColor Cyan

# 1. Dashboard
Write-Host "`n1. Dashboard:" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "https://neos-tech.web.app" -UseBasicParsing -TimeoutSec 10
    Write-Host "   [OK] $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] $_" -ForegroundColor Red
}

# 2. Cloud Function
Write-Host "`n2. Cloud Function:" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "https://rfid-gateway-6psjv5t2ka-uc.a.run.app" -Method OPTIONS -UseBasicParsing -TimeoutSec 10
    Write-Host "   [OK] $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   [INFO] $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Gateway Local
Write-Host "`n3. Gateway Local:" -ForegroundColor Yellow
try {
    $amp = [char]38
    $url = "http://192.168.1.11:8080/readerid?id=TEST" + $amp + "heart=0"
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    Write-Host "   [OK] $($r.StatusCode) - $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Not running. Execute: RUN-ADMIN.ps1" -ForegroundColor Red
}

# 4. Git
Write-Host "`n4. Git Status:" -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "   Branch: $branch" -ForegroundColor White

Write-Host "`nDONE!" -ForegroundColor Green
Write-Host "`nURLs:" -ForegroundColor Cyan
Write-Host "  Dashboard: https://neos-tech.web.app" -ForegroundColor White
Write-Host "  Function:  https://rfid-gateway-6psjv5t2ka-uc.a.run.app" -ForegroundColor White
Write-Host "  Gateway:   http://192.168.1.11:8080/readerid" -ForegroundColor White
