$ErrorActionPreference = "SilentlyContinue"

$script = Join-Path $PSScriptRoot "keep-warm.ps1"

while ($true) {
  try {
    & $script
  } catch {
    # The loop is intentionally quiet; failures are expected when the tunnel is offline.
  }
  Start-Sleep -Seconds 30
}
