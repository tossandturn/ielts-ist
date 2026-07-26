$ErrorActionPreference = "SilentlyContinue"

$targets = @(
  "http://localhost:4321/healthz",
  "https://timwang.w1.luyouxia.net/healthz"
)

foreach ($target in $targets) {
  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 -Uri $target | Out-Null
  } catch {
    # Keep-warm probes must never disturb the desktop session.
  }
}
