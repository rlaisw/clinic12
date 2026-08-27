# Update old IP 172.28.51.11 to 10.161.92.141 in all .md files
$root = "C:\kilocode\clinic11"
$oldIp = "172.28.51.11"
$newIp = "10.161.92.141"

Get-ChildItem -Path $root -Filter "*.md" | ForEach-Object {
    $content = Get-Content $_.FullName
    $updated = $content | ForEach-Object {
        $_ -replace [regex]::Escape($oldIp), $newIp
    }
    Set-Content $_.FullName $updated
    Write-Host "Updated $($_.Name)"
}
