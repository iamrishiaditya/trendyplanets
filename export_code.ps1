# Set root directory to the current working directory
$rootDir = Get-Location

# Folders and file extensions to ignore
$excludeDirs = @('node_modules', '__pycache__', '.git', 'dist', 'build', '.venv', 'venv', '.next', 'coverage', 'out')
$excludeExts = @('.img', '.bsp', '.tf', '.bds', '.bc', '.tsc', '.pyc',
                 '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
                 '.zip', '.tar', '.gz', '.7z', '.rar',
                 '.pdf', '.exe', '.dll', '.so', '.dylib',
                 '.mp4', '.mp3', '.wav', '.mov', '.avi')

# Maximum file size to include (in bytes). Increase if needed.
$maxFileSize = 2MB

# Extension → Markdown language mapping
$langMap = @{
    '.py'   = 'python'
    '.jsx'  = 'jsx'
    '.js'   = 'javascript'
    '.tsx'  = 'tsx'
    '.ts'   = 'typescript'
    '.css'  = 'css'
    '.scss' = 'scss'
    '.html' = 'html'
    '.json' = 'json'
    '.sql'  = 'sql'
    '.sh'   = 'bash'
    '.ps1'  = 'powershell'
    '.md'   = 'markdown'
    '.yml'  = 'yaml'
    '.yaml' = 'yaml'
    '.toml' = 'toml'
    '.xml'  = 'xml'
    '.go'   = 'go'
    '.rs'   = 'rust'
    '.java' = 'java'
    '.kt'   = 'kotlin'
    '.cs'   = 'csharp'
    '.cpp'  = 'cpp'
    '.c'    = 'c'
    '.h'    = 'c'
}

# Create a temporary file for the output
$tempFile = [System.IO.Path]::GetTempFileName()
$writer = [System.IO.StreamWriter]::new($tempFile, $false, [System.Text.Encoding]::UTF8)

try {
    $writer.WriteLine("Here is the current codebase for my project:")
    $writer.WriteLine()

    # 1. Directory structure
    $writer.WriteLine("=== DIRECTORY STRUCTURE ===")

    $allPaths = Get-ChildItem -Path $rootDir -Recurse -Force -ErrorAction SilentlyContinue | Where-Object {
        $item = $_
        $skip = $false
        foreach ($dir in $excludeDirs) {
            $dirPattern = [regex]::Escape([System.IO.Path]::DirectorySeparatorChar + $dir + [System.IO.Path]::DirectorySeparatorChar)
            if ($item.FullName -match $dirPattern -or $item.Name -eq $dir) {
                $skip = $true
                break
            }
        }
        -not $skip
    }

    foreach ($item in $allPaths) {
        $relPath = [System.IO.Path]::GetRelativePath($rootDir, $item.FullName)
        $writer.WriteLine($relPath)
    }
    $writer.WriteLine()

    # 2. Source files
    $sourceFiles = Get-ChildItem -Path $rootDir -File -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $file = $_
        $skip = $false

        foreach ($dir in $excludeDirs) {
            $dirPattern = [regex]::Escape([System.IO.Path]::DirectorySeparatorChar + $dir + [System.IO.Path]::DirectorySeparatorChar)
            if ($file.FullName -match $dirPattern) {
                $skip = $true
                break
            }
        }

        if ($excludeExts -contains $file.Extension.ToLower()) {
            $skip = $true
        }

        if ($file.Length -gt $maxFileSize) {
            $skip = $true
        }

        -not $skip
    }

    # 3. Append file contents
    foreach ($file in $sourceFiles) {
        $relPath = [System.IO.Path]::GetRelativePath($rootDir, $file.FullName)
        $ext = $file.Extension.ToLower()
        $lang = if ($langMap.ContainsKey($ext)) { $langMap[$ext] } else { "" }

        $writer.WriteLine("=== FILE: $relPath ===")
        $writer.WriteLine("``````$lang")

        # Read the file in a streaming fashion to avoid large allocations
        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)
            $writer.WriteLine($content)
        }
        catch {
            $writer.WriteLine("# Error reading file: $($_.Exception.Message)")
        }

        $writer.WriteLine("``````")
        $writer.WriteLine()
    }
}
finally {
    $writer.Close()
    $writer.Dispose()
}

# Copy the temp file content to the clipboard
try {
    Get-Content -Path $tempFile -Raw -Encoding UTF8 | Set-Clipboard
    Write-Host "✅ Project code successfully copied to your clipboard!" -ForegroundColor Green
    Write-Host "   (Temp file: $tempFile)" -ForegroundColor DarkGray
}
catch {
    Write-Host "❌ Failed to copy to clipboard: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   You can still open the temp file manually: $tempFile" -ForegroundColor Yellow
}

# Optional: clean up the temp file after a short delay or leave it for inspection
# Remove-Item $tempFile -Force -ErrorAction SilentlyContinue