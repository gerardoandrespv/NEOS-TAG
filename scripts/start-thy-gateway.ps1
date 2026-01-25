Write-Host "Reiniciando Sistema RFID con soporte THY..." -ForegroundColor Cyan
Write-Host ""

# Detener Gateway anterior
Write-Host "Deteniendo Gateway anterior..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {$_.ProcessName -like "*Rfid_gateway*"}
foreach ($proc in $processes) {
    try {
        $proc.Kill()
        Write-Host "  Gateway detenido (PID: $($proc.Id))" -ForegroundColor Green
    } catch {
        Write-Host "  No se pudo detener (requiere admin)" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 2

# Compilar
Write-Host ""
Write-Host "Compilando Gateway..." -ForegroundColor Yellow
Set-Location "C:\NeosTech-RFID-System-Pro"
$buildResult = dotnet build "src\Gateway\Rfid_gateway.csproj" --configuration Debug 2>&1 | Out-String
if ($buildResult -like "*error*") {
    Write-Host "ERROR en compilación:" -ForegroundColor Red
    Write-Host $buildResult
    pause
    exit
} else {
    Write-Host "  Compilado OK" -ForegroundColor Green
}

# Copiar DLL y config
Copy-Item "src\Gateway\SWNetApi.dll" "src\Gateway\bin\Debug\net8.0\" -Force -ErrorAction SilentlyContinue
Copy-Item "src\Gateway\gateway.config.json" "src\Gateway\bin\Debug\net8.0\" -Force

# Iniciar
Write-Host ""
Write-Host "Iniciando Gateway con THY DLL..." -ForegroundColor Green
Write-Host "Puerto: 60000" -ForegroundColor Cyan
Write-Host ""

dotnet run --project src\Gateway\Rfid_gateway.csproj
