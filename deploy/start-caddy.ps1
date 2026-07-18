$ErrorActionPreference = "Stop"

$caddyProcesses = Get-CimInstance Win32_Process -Filter "name='caddy.exe'"
foreach ($process in $caddyProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

caddy validate --config "D:\CodexWork\ielts-trainer\deploy\Caddyfile"

Start-Process -FilePath "caddy" `
  -ArgumentList "run --config D:\CodexWork\ielts-trainer\deploy\Caddyfile" `
  -WorkingDirectory "D:\CodexWork\ielts-trainer" `
  -WindowStyle Hidden

Start-Sleep -Seconds 3
Get-NetTCPConnection -LocalPort 80,443 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Format-Table -AutoSize
