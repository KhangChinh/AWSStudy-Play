$files = Get-ChildItem -Path "E:\UCHIMI\fcj-workshop-template\content\1-Worklog" -Filter "*.md" -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Encoding UTF8
    $modified = $false
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match "^\|\s*([234567, ]+)\s*\|(.*)") {
            $days = $matches[1].Trim()
            $rest = $matches[2]
            
            $days = $days -replace "2", "Mon"
            $days = $days -replace "3", "Tue"
            $days = $days -replace "4", "Wed"
            $days = $days -replace "5", "Thu"
            $days = $days -replace "6", "Fri"
            $days = $days -replace "7", "Sat"
            
            $content[$i] = "| $days |$rest"
            $modified = $true
        }
    }
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Output "Modified: $($file.FullName)"
    }
}
