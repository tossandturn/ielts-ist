$ErrorActionPreference = "Stop"

$projectDir = "D:\CodexWork\ielts-trainer"
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$config = "C:\Users\10604\.cloudflared\config.yml"
$outLog = Join-Path $projectDir "tmp-cloudflare-tunnel-out.log"
$errLog = Join-Path $projectDir "tmp-cloudflare-tunnel-err.log"

Set-Location $projectDir

$nodeProcesses = Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object { $_.CommandLine -match [regex]::Escape($projectDir) -or $_.CommandLine -match 'server\.js' }
foreach ($process in $nodeProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Process -FilePath "node" `
  -ArgumentList "server.js" `
  -WorkingDirectory $projectDir `
  -WindowStyle Hidden

Start-Sleep -Seconds 2
$localStatus = (Invoke-WebRequest -Uri "http://127.0.0.1:4321/" -UseBasicParsing -TimeoutSec 20).StatusCode
Write-Host "IELTS-ist local app: http://127.0.0.1:4321/ status=$localStatus"

Get-CimInstance Win32_Process -Filter "name='cloudflared.exe'" -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue
$cmd = "set `"HTTP_PROXY=http://127.0.0.1:7897`" && set `"HTTPS_PROXY=http://127.0.0.1:7897`" && `"$cloudflared`" tunnel --config `"$config`" run ielts-ist > `"$outLog`" 2> `"$errLog`""
Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/s", "/c", $cmd) -WindowStyle Hidden

Start-Sleep -Seconds 8
$running = Get-Process cloudflared -ErrorAction SilentlyContinue
if (-not $running) {
  throw "cloudflared did not start. Check $errLog"
}
Write-Host "Cloudflare Tunnel running for https://ieltsist.com"
