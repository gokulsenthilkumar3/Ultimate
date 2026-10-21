$ErrorActionPreference = 'Stop'
$app = Join-Path $PSScriptRoot 'growthtrack-ultimate'
node (Join-Path $app 'scripts/build-desktop.mjs')
