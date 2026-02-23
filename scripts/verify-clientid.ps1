$pairs = @(
    @{ name='dashboard-modules.js'; path='c:\NeosTech-RFID-System-Pro\src\web\js\dashboard-modules.js' },
    @{ name='index.html';           path='c:\NeosTech-RFID-System-Pro\src\web\index.html' },
    @{ name='emergency-alerts-panel.html'; path='c:\NeosTech-RFID-System-Pro\src\web\emergency-alerts-panel.html' },
    @{ name='mobile-alerts.html';   path='c:\NeosTech-RFID-System-Pro\src\web\mobile-alerts.html' },
    @{ name='register-alerts.html'; path='c:\NeosTech-RFID-System-Pro\src\web\register-alerts.html' }
)
foreach ($p in $pairs) {
    $txt = [System.IO.File]::ReadAllLines($p.path)
    $reads  = @($txt | Select-String '\.where\(.clientId').Count
    $writes = @($txt | Select-String 'clientId:').Count
    $bootstrap = @($txt | Select-String 'onAuthStateChanged').Count
    Write-Output "$($p.name)   where-filters=$reads   payload-clientId=$writes   auth-bootstrap=$bootstrap"
}
