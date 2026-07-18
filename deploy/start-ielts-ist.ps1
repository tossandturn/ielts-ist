$ErrorActionPreference = "Stop"
Set-Location "D:\CodexWork\ielts-trainer"

$nodeProcesses = Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object { $_.CommandLine -match 'D:\\CodexWork\\ielts-trainer|server\.js' }
foreach ($process in $nodeProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Process -FilePath "node" `
  -ArgumentList "server.js" `
  -WorkingDirectory "D:\CodexWork\ielts-trainer" `
  -WindowStyle Hidden

Start-Sleep -Seconds 2
$status = (Invoke-WebRequest -Uri "http://127.0.0.1:4321/" -UseBasicParsing -TimeoutSec 20).StatusCode
Write-Host "IELTS-ist local app: http://127.0.0.1:4321/ status=$status"
