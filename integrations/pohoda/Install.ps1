$ErrorActionPreference = 'Stop'
try {
    Write-Host 'SPEKTRA - automaticka synchronizacia zasob kazdych 15 minut'
    Write-Host 'Spustite na pocitaci SPEKTRA pod beznym Windows pouzivatelom. mServer Spektra musi bezat na porte 8080.'
    $dest = Join-Path $env:LOCALAPPDATA 'Spektra-PohodaSync'
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    # Load and persist DACL only: do not request owner or SACL/audit privileges.
    $directory = New-Object System.IO.DirectoryInfo($dest)
    $acl = $directory.GetAccessControl([Security.AccessControl.AccessControlSections]::Access)
    $acl.SetAccessRuleProtection($true,$false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity.User,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $acl.SetAccessRule($rule)
    $directory.SetAccessControl($acl)
    foreach ($file in @('Sync.ps1','StockParser.ps1')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $dest -Force }
    $name = Read-Host 'Prihlasovacie meno do POHODY'
    if ([string]::IsNullOrWhiteSpace($name) -or $name.Contains(':')) { throw 'Neplatne meno POHODY.' }
    $secret = Read-Host 'Heslo do POHODY' -AsSecureString
    (New-Object Management.Automation.PSCredential($name,$secret)) | Export-Clixml (Join-Path $dest 'pohoda.credential.xml')
    $email = Read-Host 'Email administratora Spektra / Cenove ponuky'
    $secret = Read-Host 'Heslo do Spektry / Cenovych ponuk' -AsSecureString
    (New-Object Management.Automation.PSCredential($email,$secret)) | Export-Clixml (Join-Path $dest 'spektra.credential.xml')
    $exe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    & $exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dest 'Sync.ps1') -Interactive
    if ($LASTEXITCODE -ne 0) { throw 'Prvy prenos zlyhal. Automaticka uloha nebola vytvorena. Pozrite vypis vyssie.' }
    $action = New-ScheduledTaskAction -Execute $exe -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+(Join-Path $dest 'Sync.ps1')+'"')
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(15) -RepetitionInterval (New-TimeSpan -Minutes 15)
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 12) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName 'Spektra - synchronizacia POHODA' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host 'HOTOVO. Prvy prenos prebehol. Dalsie prenosy kazdych 15 minut pri prihlasenom Windows a spustenom mServeri.' -ForegroundColor Green
    Write-Host ('Zaznam priebehu: '+(Join-Path $dest 'Synchronizacia.log'))
} catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Read-Host 'Enter na zatvorenie' | Out-Null
