<#
  Flowtime — Tema Renk Degistirme Araci
  Kullanim: powershell -ExecutionPolicy Bypass -File "scripts/replace-colors.ps1"
  DryRun:   powershell -ExecutionPolicy Bypass -File "scripts/replace-colors.ps1" -DryRun
#>

param(
    [switch]$DryRun
)

$colorMap = [ordered]@{}

# Mapping from Linear Dark to Slate Dark
$colorMap['#0D0D0D'] = '#242424'
$colorMap['#161616'] = '#2E2E2E'
$colorMap['#1F1F1F'] = '#383838'
$colorMap['#2A2A2A'] = '#3D3D3D'
$colorMap['#222222'] = '#353535'
$colorMap['#2D2D2D'] = '#404040'
$colorMap['#666666'] = '#757575'
$colorMap['#888888'] = '#9A9A9A'
$colorMap['#F5F5F5'] = '#F0F0F0'
$colorMap['#00C170'] = '#4F8EF7'
$colorMap['#00A862'] = '#3D77E0'
$colorMap['#0EA5E9'] = '#34C774'
$colorMap['#EF4444'] = '#E05555'
$colorMap['#DC2626'] = '#C44545'

$srcPath = Join-Path $PSScriptRoot '..\src'
$files = Get-ChildItem -Path $srcPath -Include '*.tsx', '*.scss' -Recurse

$totalUpdated = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    foreach ($old in $colorMap.Keys) {
        $new = $colorMap[$old]
        $content = $content -replace [regex]::Escape($old), $new
    }

    if ($content -ne $original) {
        if ($DryRun) {
            Write-Output "[DRY RUN] Would update: $($file.Name)"
        }
        else {
            Set-Content $file.FullName -Value $content -NoNewline
            Write-Output "Updated: $($file.Name)"
        }
        $totalUpdated++
    }
}

Write-Output ""
Write-Output "--- $totalUpdated file(s) updated ---"
if ($DryRun) { Write-Output "(DryRun mode - no files were actually changed)" }
