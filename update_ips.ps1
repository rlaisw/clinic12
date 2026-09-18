# Update stale IP/domain references in all .md files.
# Edit the $old / $new values, then run from PowerShell:
#   powershell -File update_ips.ps1
$root = "C:\kilocode\clinic12"
$old = "10.161.92.142"
$new = "10.161.92.141"

Get-ChildItem -Path $root -Filter "*.md" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName
    $updated = $content | ForEach-Object {
        $_ -replace [regex]::Escape($old), $new
    }
    Set-Content $_.FullName $updated
    Write-Host "Updated $($_.Name)"
}
