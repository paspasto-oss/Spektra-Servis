@echo off
powershell.exe -NoProfile -Command "Unregister-ScheduledTask -TaskName 'Spektra - synchronizacia POHODA' -Confirm:$false"
pause
