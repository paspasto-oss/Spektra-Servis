param([switch]$Interactive)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
. (Join-Path $PSScriptRoot 'StockParser.ps1')
$api = 'https://rrakzoicawqbcpnzavet.supabase.co'
$key = 'sb_publishable_ZZOAMeOcSHS6IGghKIu1lA_xss5sJzK'
$lock = $null; $success = $false; $stage = 'start'; $xmlPath = Join-Path $PSScriptRoot 'export.tmp.xml'
function Write-SyncLog([string]$message) {
    $log = Join-Path $PSScriptRoot 'Synchronizacia.log'
    if ((Test-Path $log) -and (Get-Item $log).Length -gt 1048576) { Move-Item $log ($log+'.previous') -Force }
    ((Get-Date -Format o) + ' ' + $message) | Add-Content -LiteralPath $log -Encoding UTF8
    if ($Interactive) { Write-Host $message }
}
try {
    try { $lock = [IO.File]::Open((Join-Path $PSScriptRoot 'sync.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None) } catch { exit 0 }
    $stage = 'prihlasovacie udaje'
    $pohoda = Import-Clixml (Join-Path $PSScriptRoot 'pohoda.credential.xml')
    $cloud = Import-Clixml (Join-Path $PSScriptRoot 'spektra.credential.xml')
    $basic = [Convert]::ToBase64String([Text.Encoding]::GetEncoding(1250).GetBytes($pohoda.UserName+':'+$pohoda.GetNetworkCredential().Password))
    $ph = @{'STW-Authorization'=('Basic '+$basic);'STW-Application'='Spektra stock sync'}
    $stage = 'mServer localhost:8080 - overenie firmy a roku'
    Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/status?companyDetail' -Headers $ph -OutFile $xmlPath -TimeoutSec 30 -MaximumRedirection 0 | Out-Null
    $status = Read-SafeXml $xmlPath
    $db = $status.SelectSingleNode('/*/companyDetail/databaseName')
    $year = $status.SelectSingleNode('/*/companyDetail/year')
    if (!$db -or !$year -or $db.InnerText -ne '53690036_2026.mdb' -or $year.InnerText -ne '2026') { throw 'Nespravna firma alebo rok.' }
    $stage = 'export zasob POHODA'
    $id = 'spektra-' + [Guid]::NewGuid().ToString('N')
    $request = @"
<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd" xmlns:lStk="http://www.stormware.cz/schema/version_2/list_stock.xsd" id="$id" ico="53690036" application="Spektra sync" version="2.0" note="Read only stock export"><dat:dataPackItem id="stocks" version="2.0"><lStk:listStockRequest version="2.0" stockVersion="2.0"><lStk:requestStock/></lStk:listStockRequest></dat:dataPackItem></dat:dataPack>
"@
    Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/xml' -Method Post -Headers $ph -ContentType 'text/xml' -Body ([Text.Encoding]::GetEncoding(1250).GetBytes($request)) -OutFile $xmlPath -TimeoutSec 300 -MaximumRedirection 0 | Out-Null
    $stage = 'kontrola XML exportu'
    $payload = Convert-StockExport $xmlPath
    $stage = 'prihlasenie Spektra - aktivny administrator'
    $login = @{email=$cloud.UserName;password=$cloud.GetNetworkCredential().Password} | ConvertTo-Json -Compress
    $session = Invoke-RestMethod -Uri ($api+'/auth/v1/token?grant_type=password') -Method Post -Headers @{apikey=$key} -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($login)) -TimeoutSec 30
    $headers = @{apikey=$key;Authorization=('Bearer '+$session.access_token)}
    $stage = 'odoslanie celeho exportu do Spektry'
    $body = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 5 -Compress))
    $result = Invoke-RestMethod -Uri ($api+'/rest/v1/rpc/spektra_sync_stocks') -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body -TimeoutSec 120
    if ($result.status -notin @('published','already_current') -or !$result.count) { throw 'Neocakavana odpoved.' }
    Write-SyncLog ('OK - '+$result.count+' kariet; export '+$payload.p_exported_at+'; '+$result.status)
    $success = $true
} catch {
    # Never write request bodies, tokens, credentials or raw API responses to logs.
    $http = ''
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $http = ' HTTP '+[int]$_.Exception.Response.StatusCode }
    Write-SyncLog ('CHYBA - '+$stage+$http+'. Posledny uspesny stav zostava zachovany.')
} finally {
    if ($session -and $headers) { try { Invoke-RestMethod -Uri ($api+'/auth/v1/logout?scope=local') -Method Post -Headers $headers -TimeoutSec 10 | Out-Null } catch {} }
    if ($lock) { Remove-Item -LiteralPath $xmlPath -Force -ErrorAction SilentlyContinue; $lock.Dispose() }
    $login=$null; $basic=$null; $session=$null; $headers=$null; $pohoda=$null; $cloud=$null
}
if (!$success) { exit 1 }
