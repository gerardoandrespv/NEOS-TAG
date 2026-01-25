# Script PowerShell para agregar tags a Firestore usando Firebase CLI

Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 Agregando tags de prueba a Firestore..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════`n" -ForegroundColor Cyan

$clientId = "condominio-neos"
$projectId = "neos-tech"

# Tag 1 - E28069150000502009073A7F (WHITELIST)
Write-Host "📝 Agregando Tag 1 (whitelist)..." -ForegroundColor Yellow
firebase firestore:set "clients/$clientId/tags/tag1" @"
{
  \"tag_id\": \"E28069150000502009073A7F\",
  \"status\": \"whitelist\",
  \"name\": \"Tag de Prueba 1\",
  \"owner\": \"Administrador\"
}
"@ --project $projectId

# Tag 2 - E28069150000402009073E7F (WHITELIST)
Write-Host "📝 Agregando Tag 2 (whitelist)..." -ForegroundColor Yellow
firebase firestore:set "clients/$clientId/tags/tag2" @"
{
  \"tag_id\": \"E28069150000402009073E7F\",
  \"status\": \"whitelist\",
  \"name\": \"Tag de Prueba 2\",
  \"owner\": \"Administrador\"
}
"@ --project $projectId

# Tag 3 - Test Blacklist
Write-Host "📝 Agregando Tag 3 (blacklist)..." -ForegroundColor Yellow
firebase firestore:set "clients/$clientId/tags/tag3" @"
{
  \"tag_id\": \"E280691500004020090BBBBB\",
  \"status\": \"blacklist\",
  \"name\": \"Tag Bloqueado\",
  \"owner\": \"Test\"
}
"@ --project $projectId

Write-Host "`n✅ Tags agregados correctamente!" -ForegroundColor Green
Write-Host "🔍 Verifica en: https://console.firebase.google.com/project/$projectId/firestore`n" -ForegroundColor Cyan
