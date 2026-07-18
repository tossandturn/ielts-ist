$ErrorActionPreference = "Stop"

$projectDir = "D:\CodexWork\ielts-trainer"
$luyouxiaUi = Get-ChildItem -Path "D:\Program Files (x86)", "C:\Program Files (x86)", "D:\" `
  -Filter "LyxUI.exe" `
  -Recurse `
  -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName

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

if ($luyouxiaUi -and (Test-Path $luyouxiaUi)) {
  $lyxRunning = Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -in @("LyxUI", "LyxSvr") }
  if (-not $lyxRunning) {
    Start-Process -FilePath $luyouxiaUi -WorkingDirectory (Split-Path $luyouxiaUi)
  }
} else {
  Write-Warning "LuYouXia UI not found. Start LuYouXia manually if public access fails."
}

Start-Sleep -Seconds 5

$localStatus = (Invoke-WebRequest -Uri "http://127.0.0.1:4321/" -UseBasicParsing -TimeoutSec 20).StatusCode
Write-Host "IELTS-ist local app: http://127.0.0.1:4321/ status=$localStatus"

try {
  $publicHeaders = & curl.exe -s -D - "https://ieltsist.com/api/tasks" -o NUL
  $publicStatusLine = $publicHeaders | Select-Object -First 1
  if ($LASTEXITCODE -ne 0 -or $publicStatusLine -notmatch " 200 ") {
    throw "curl public check failed: $publicStatusLine"
  }
  Write-Host "IELTS-ist public app: https://ieltsist.com status=200"
} catch {
  Write-Warning "Public check failed. Confirm LuYouXia mapping and certificate: $($_.Exception.Message)"
}
