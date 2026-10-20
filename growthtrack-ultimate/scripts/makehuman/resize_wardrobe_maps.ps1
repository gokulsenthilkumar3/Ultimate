# Optional Windows build step after compile_wardrobe.py. Runtime maps are capped
# at 1024px; the byte-verified CC0 originals remain in .tmp/wardrobe-cc0/.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$wardrobeOutput = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../public/assets/wardrobe'))
foreach ($file in Get-ChildItem -LiteralPath $wardrobeOutput -Filter '*.png') {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    $scale = [Math]::Min(1.0, 1024.0 / [Math]::Max($image.Width, $image.Height))
    $bitmap = [System.Drawing.Bitmap]::new([int]($image.Width * $scale), [int]($image.Height * $scale))
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, $bitmap.Width, $bitmap.Height)
    $image.Dispose()
    $bitmap.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
