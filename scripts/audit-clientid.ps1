$activeFiles = @(
    "c:\NeosTech-RFID-System-Pro\src\web\js\dashboard-modules.js",
    "c:\NeosTech-RFID-System-Pro\src\web\index.html",
    "c:\NeosTech-RFID-System-Pro\src\web\emergency-alerts-panel.html",
    "c:\NeosTech-RFID-System-Pro\src\web\mobile-alerts.html",
    "c:\NeosTech-RFID-System-Pro\src\web\register-alerts.html"
)
$cols = @('emergency_alerts','alert_subscribers','access_logs','rfid_events','users','whitelist','blacklist')
$pattern = "collection\('(" + ($cols -join '|') + ")'\)"

foreach ($f in $activeFiles) {
    if (-not (Test-Path $f)) { continue }
    $lines = [System.IO.File]::ReadAllLines($f)
    $fname = Split-Path $f -Leaf
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) {
            $window = ($lines[$i..([Math]::Min($i+4,$lines.Count-1))] -join ' ')
            if ($window -notmatch 'clientId') {
                Write-Output "MISSING|$fname|$($i+1)|$($lines[$i].Trim())"
            }
        }
    }
}
