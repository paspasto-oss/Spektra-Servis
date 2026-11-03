# Compatible with Windows PowerShell 5.1. No network or credentials here.
function Read-SafeXml([string]$Path) {
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $reader = [System.Xml.XmlReader]::Create($Path, $settings)
    $doc = New-Object System.Xml.XmlDocument
    $doc.XmlResolver = $null
    try { $doc.Load($reader) } finally { $reader.Dispose() }
    return ,$doc
}
function Convert-StockExport([string]$Path) {
    $doc = Read-SafeXml $Path
    $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
    foreach ($pair in @(@('rsp','response'),@('lst','list_stock'),@('stk','stock'),@('typ','type'))) {
        $ns.AddNamespace($pair[0], ('http://www.stormware.cz/schema/version_2/' + $pair[1] + '.xsd'))
    }
    $root = $doc.SelectSingleNode('/rsp:responsePack', $ns)
    if (!$root -or $root.GetAttribute('ico') -ne '53690036' -or $root.GetAttribute('state') -ne 'ok') { throw 'Neplatny export alebo nespravne ICO.' }
    $items = @($root.SelectNodes('rsp:responsePackItem',$ns))
    $lists = @($root.SelectNodes('rsp:responsePackItem/lst:listStock',$ns))
    if ($items.Count -ne 1 -or $lists.Count -ne 1) { throw 'Export nema presne jeden uplny zoznam zasob.' }
    foreach ($node in ($items + $lists)) { if ($node.GetAttribute('state') -ne 'ok') { throw 'POHODA vratila chybu exportu.' } }
    $rawTime = $lists[0].GetAttribute('dateTimeStamp')
    $localTime = [DateTime]::ParseExact($rawTime,'yyyy-MM-ddTHH:mm:ss',[Globalization.CultureInfo]::InvariantCulture)
    $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Central Europe Standard Time')
    $exported = [TimeZoneInfo]::ConvertTimeToUtc([DateTime]::SpecifyKind($localTime,[DateTimeKind]::Unspecified),$zone).ToString('o')
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    $rows = New-Object 'System.Collections.Generic.List[object]'
    foreach ($h in $lists[0].SelectNodes('lst:stock/stk:stockHeader',$ns)) {
        $r = [ordered]@{}
        foreach ($pair in @(@('id','stk:id'),@('code','stk:code'),@('plu','stk:PLU'),@('name','stk:name'),@('unit','stk:unit'),@('storage_ref','stk:storage/typ:id'),@('storage_name','stk:storage/typ:ids'))) {
            $v = $h.SelectSingleNode($pair[1],$ns)
            $r[$pair[0]] = if ($null -eq $v) { $null } else { $v.InnerText }
        }
        if ($r.id -notmatch '^\d+$' -or !$seen.Add($r.id) -or [string]::IsNullOrWhiteSpace($r.name)) { throw 'Neplatna karta alebo duplicitne ID POHODY.' }
        foreach ($pair in @(@('quantity_available','stk:count'),@('quantity_issuable','stk:countIssue'))) {
            $v = $h.SelectSingleNode($pair[1],$ns)
            $r[$pair[0]] = if ($null -eq $v) { $null } else { [decimal]::Parse($v.InnerText,[Globalization.NumberStyles]::Float,[Globalization.CultureInfo]::InvariantCulture) }
        }
        $rows.Add([pscustomobject]$r)
    }
    if ($rows.Count -lt 1) { throw 'Prazdny export nebude odoslany.' }
    return @{p_company='53690036';p_year=2026;p_exported_at=$exported;p_rows=$rows.ToArray()}
}
