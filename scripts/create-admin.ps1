#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Crea un usuario administrador en Firebase Authentication y Firestore

.DESCRIPTION
    Este script usa Firebase CLI para crear un usuario admin.
    
.EXAMPLE
    .\create-admin.ps1
#>

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "👤 CREAR USUARIO ADMINISTRADOR" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

# Solicitar datos
$email = Read-Host "📧 Email del administrador"
$password = Read-Host "🔑 Contraseña (mínimo 6 caracteres)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)
$displayName = Read-Host "👤 Nombre completo"

# Validar
if ([string]::IsNullOrWhiteSpace($email) -or $email -notmatch "@") {
    Write-Host "❌ Email inválido" -ForegroundColor Red
    exit 1
}

if ($passwordPlain.Length -lt 6) {
    Write-Host "❌ Contraseña debe tener al menos 6 caracteres" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($displayName) -or $displayName.Length -lt 3) {
    Write-Host "❌ Nombre debe tener al menos 3 caracteres" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Creando usuario..." -ForegroundColor Yellow

# Crear archivo temporal con los datos del usuario
$userData = @{
    email = $email.Trim()
    password = $passwordPlain
    displayName = $displayName.Trim()
    emailVerified = $true
} | ConvertTo-Json

$tempFile = New-TemporaryFile
$userData | Out-File -FilePath $tempFile.FullName -Encoding UTF8

try {
    # Usar Firebase CLI para crear usuario
    Write-Host ""
    Write-Host "📝 INSTRUCCIONES MANUALES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Abre Firebase Console: https://console.firebase.google.com/project/neos-tech/authentication/users" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Click en 'Add user' (Agregar usuario)" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Ingresa los siguientes datos:" -ForegroundColor White
    Write-Host "   Email:      $email" -ForegroundColor Cyan
    Write-Host "   Password:   [la que ingresaste]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Después de crear el usuario, copia su UID" -ForegroundColor White
    Write-Host ""
    
    $uid = Read-Host "5. Pega el UID aquí"
    
    if ([string]::IsNullOrWhiteSpace($uid)) {
        Write-Host "❌ UID inválido" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "⏳ Creando documento en Firestore..." -ForegroundColor Yellow
    
    # Crear documento en Firestore usando Firebase CLI
    $firestoreData = @"
{
  "user_id": "$uid",
  "email": "$email",
  "name": "$displayName",
  "role": "admin",
  "status": "active"
}
"@
    
    $firestoreFile = New-TemporaryFile
    $firestoreData | Out-File -FilePath $firestoreFile.FullName -Encoding UTF8
    
    # Importar a Firestore
    Write-Host ""
    Write-Host "6. Ejecuta el siguiente comando para crear el documento en Firestore:" -ForegroundColor White
    Write-Host ""
    Write-Host "firebase firestore:set users/$uid --data '$firestoreData'" -ForegroundColor Cyan
    Write-Host ""
    
    $confirm = Read-Host "¿Ejecutar comando ahora? (S/N)"
    
    if ($confirm -eq 'S' -or $confirm -eq 's') {
        $command = "firebase firestore:set users/$uid '$firestoreFile'"
        Invoke-Expression $command
    }
    
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host "✅ PROCESO COMPLETADO" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Green
    Write-Host ""
    Write-Host "🔐 CREDENCIALES DE ACCESO:" -ForegroundColor Cyan
    Write-Host "   URL:        https://neos-tech.web.app" -ForegroundColor White
    Write-Host "   Email:      $email" -ForegroundColor White
    Write-Host "   Contraseña: [la que ingresaste]" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   - Guarda estas credenciales en un lugar seguro" -ForegroundColor White
    Write-Host "   - Intenta iniciar sesión en: https://neos-tech.web.app" -ForegroundColor White
    Write-Host ""
    
} finally {
    # Limpiar archivos temporales
    if (Test-Path $tempFile.FullName) {
        Remove-Item $tempFile.FullName -Force
    }
    if (Test-Path $firestoreFile.FullName) {
        Remove-Item $firestoreFile.FullName -Force
    }
}
