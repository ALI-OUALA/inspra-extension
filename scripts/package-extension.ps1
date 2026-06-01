$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root "apps/extension/.output/chrome-mv3"
$release = Join-Path $root "release"
$zip = Join-Path $release "inspra-extension-v0.1.0.zip"

if (!(Test-Path $output)) {
  throw "Extension output not found. Run npm run build first."
}

if (!(Test-Path $release)) {
  New-Item -ItemType Directory -Path $release | Out-Null
}

if (Test-Path $zip) {
  Remove-Item -LiteralPath $zip -Force
}

Compress-Archive -Path (Join-Path $output "*") -DestinationPath $zip -Force
Write-Host "Created $zip"
