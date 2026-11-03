$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'StockParser.ps1')
$path=[IO.Path]::GetTempFileName()
function Assert-True($value,$message) { if (!$value) { throw $message } }
function Write-Fixture([string]$cards,[string]$ico='53690036') {
    $xml='<rsp:responsePack xmlns:rsp="http://www.stormware.cz/schema/version_2/response.xsd" xmlns:lst="http://www.stormware.cz/schema/version_2/list_stock.xsd" xmlns:stk="http://www.stormware.cz/schema/version_2/stock.xsd" ico="'+$ico+'" state="ok"><rsp:responsePackItem state="ok"><lst:listStock state="ok" dateTimeStamp="2026-11-03T20:08:57">'+$cards+'</lst:listStock></rsp:responsePackItem></rsp:responsePack>'
    [IO.File]::WriteAllText($path,$xml)
}
try {
    $a='<lst:stock><stk:stockHeader><stk:id>1</stk:id><stk:code>SAME</stk:code><stk:name>A</stk:name><stk:count>0</stk:count><stk:countIssue>-1.5</stk:countIssue></stk:stockHeader></lst:stock>'
    $b='<lst:stock><stk:stockHeader><stk:id>2</stk:id><stk:code>SAME</stk:code><stk:name>B</stk:name></stk:stockHeader></lst:stock>'
    Write-Fixture ($a+$b)
    $p=Convert-StockExport $path
    Assert-True ($p.p_rows.Count -eq 2) 'Same codes were merged'
    Assert-True ($p.p_rows[0].quantity_available -eq 0) 'Zero lost'
    Assert-True ($p.p_rows[0].quantity_issuable -eq -1.5) 'Decimal/negative lost'
    Assert-True ($null -eq $p.p_rows[1].quantity_available) 'Missing quantity became zero'
    Assert-True ($p.p_exported_at -eq '2026-11-03T19:08:57.0000000Z') 'Timezone incorrect'
    foreach ($kind in @('duplicate','company','empty','malformed','dtd')) {
        switch($kind) {
            duplicate { Write-Fixture ($a+$a) }
            company { Write-Fixture $a '00000000' }
            empty { Write-Fixture '' }
            malformed { [IO.File]::WriteAllText($path,'<broken>') }
            dtd { [IO.File]::WriteAllText($path,'<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>') }
        }
        $failed=$false
        try { Convert-StockExport $path | Out-Null } catch { $failed=$true }
        Assert-True $failed ('Accepted '+$kind)
    }
    Write-Host 'Parser tests passed: duplicate codes retained; unique IDs; quantities; timezone; wrong company, incomplete XML and DTD rejected.'
} finally { Remove-Item -LiteralPath $path -Force }
