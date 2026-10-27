param()
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

# An explicit source allowlist keeps owner data, model binaries, screenshots,
# dependency caches and unrelated working-tree changes out of the handoff.
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceFiles = @(
  'docs/real-human-3d/16-private-anatomy.md',
  'docs/real-human-3d/README.md',
  'docs/real-human-3d/IMPLEMENTATION_PROGRESS.md',
  'docs/HUMAN_REALISM_AND_MEASUREMENT_PLAN.md',
  'docs/IMPLEMENTATION_STATUS.md',
  'docs/real-human-3d/02-open-source-landscape.md',
  'docs/real-human-3d/03-anatomy-spec.md',
  'docs/real-human-3d/04-skin-hair-eyes.md',
  'docs/real-human-3d/code/anatomy-spec.mjs',
  'docs/real-human-3d/07-asset-pipeline-and-glb-spec.md',
  'src/components/HumanoidViewer.tsx',
  'src/components/morphEngine/HumanoidClone.jsx',
  'src/components/morphEngine/anatomyDeformation.js',
  'src/components/morphEngine/anatomyDeformation.test.js',
  'src/components/morphEngine/anatomyGuides.js',
  'src/components/morphEngine/anatomyTissueGeometry.js',
  'src/components/morphEngine/anatomyTissueGeometry.test.js',
  'src/components/morphEngine/anatomyAttachment.test.js',
  'src/components/morphEngine/anatomySurface.js',
  'src/components/morphEngine/anatomySurface.test.js',
  'src/components/morphEngine/avatarExport.js',
  'src/components/morphEngine/captureRuntime.js',
  'src/components/morphEngine/deformedGeometryNormals.js',
  'src/components/morphEngine/modelAssetRegistry.js',
  'src/components/morphEngine/protectedCapture.test.js',
  'src/components/body3d/physicalSkinMaterial.js',
  'src/components/physique/AnatomyCustomizationPanel.jsx',
  'src/components/physique/AnatomyCustomizationPanel.test.jsx',
  'src/components/physique/HumanSurfaceControls.test.jsx',
  'src/components/physique/SurfaceDetailControls.jsx',
  'src/config/appearanceDetail.json',
  'src/lib/appearanceDetail.js',
  'src/lib/appearanceDetail.test.js',
  'src/lib/physiqueProfile.js',
  'src/store/__tests__/appearanceDatabase.test.js',
  'src/tests/physicalSkinMaterial.test.js',
  'tests/e2e/private-anatomy.spec.ts',
  'tests/e2e/physique-appearance-detail.spec.ts',
  'playwright.physique.config.ts',
  'scripts/review-private-anatomy.html',
  'scripts/package-private-anatomy.ps1'
)
$snapshots = @($sourceFiles | ForEach-Object {
  $absolute = [IO.Path]::GetFullPath((Join-Path $projectRoot $_))
  if (-not $absolute.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Source escapes the project: $_"
  }
  $bytes = [IO.File]::ReadAllBytes($absolute)
  $hasher = [Security.Cryptography.SHA256]::Create()
  try { $hash = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() }
  finally { $hasher.Dispose() }
  @{ path = $_; bytes = $bytes; sha256 = $hash }
})
$manifest = [ordered]@{
  schemaVersion = 1
  purpose = 'Source overlay for the existing GrowthTrack repository; dependencies and existing model assets are required.'
  consolidatedPlan = 'docs/real-human-3d/16-private-anatomy.md'
  removedPaths = @('docs/ANATOMY_ASSET_PLAN.md', 'docs/ANATOMY_CUSTOMIZATION_RESEARCH_PLAN.md', 'docs/real-human-3d/16-male-anatomy-research.md', 'src/components/morphEngine/anatomyContours.js', 'src/components/morphEngine/anatomyContours.test.js', 'playwright.anatomy-review.config.ts', 'scripts/review-pelvis.html', 'tests/e2e/physique-model.spec.ts')
  files = @($snapshots | ForEach-Object { [ordered]@{ path = $_.path; bytes = $_.bytes.Length; sha256 = $_.sha256 } })
}
$outputDir = Join-Path $projectRoot '.tmp'
[IO.Directory]::CreateDirectory($outputDir) | Out-Null
$outputPath = Join-Path $outputDir 'private-anatomy-implementation.zip'
$stream = [IO.File]::Open($outputPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite)
try {
  $archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($file in $snapshots) {
      $entry = $archive.CreateEntry($file.path, [IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      try { $entryStream.Write($file.bytes, 0, $file.bytes.Length) } finally { $entryStream.Dispose() }
    }
    $manifestBytes = [Text.Encoding]::UTF8.GetBytes(($manifest | ConvertTo-Json -Depth 8))
    $entry = $archive.CreateEntry('MANIFEST.json', [IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    try { $entryStream.Write($manifestBytes, 0, $manifestBytes.Length) } finally { $entryStream.Dispose() }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

# Read the embedded manifest and every entry back from the ZIP. Verification
# does not extract or replace any source files.
$stream = [IO.File]::OpenRead($outputPath)
try {
  $archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Read)
  try {
    $reader = New-Object IO.StreamReader($archive.GetEntry('MANIFEST.json').Open())
    try { $savedManifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($archive.Entries.Count -ne $snapshots.Count + 1) { throw 'Unexpected ZIP entries.' }
    foreach ($file in $savedManifest.files) {
      $entry = $archive.GetEntry($file.path)
      if (-not $entry -or $entry.Length -ne $file.bytes) { throw "Missing or truncated ZIP entry: $($file.path)" }
      $entryStream = $entry.Open()
      $hasher = [Security.Cryptography.SHA256]::Create()
      try { $hash = [BitConverter]::ToString($hasher.ComputeHash($entryStream)).Replace('-', '').ToLowerInvariant() }
      finally { $hasher.Dispose(); $entryStream.Dispose() }
      if ($hash -ne $file.sha256) { throw "ZIP checksum mismatch: $($file.path)" }
    }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }
$rawBytes = ($snapshots | ForEach-Object { $_.bytes.Length } | Measure-Object -Sum).Sum + $manifestBytes.Length
$zipBytes = (Get-Item -LiteralPath $outputPath).Length
[ordered]@{ path = $outputPath; files = $snapshots.Count; sourceBytes = $rawBytes; zipBytes = $zipBytes; reductionPercent = [Math]::Round((1 - $zipBytes / $rawBytes) * 100, 1); verified = $true } | ConvertTo-Json
