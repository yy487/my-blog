$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $env:TEMP ('瑜瑜-upload-check-' + [Guid]::NewGuid().ToString('N'))
$previousConsoleEncoding = [Console]::OutputEncoding
$global:patchTestRemote = 'https://github.com/yy487/my-blog.git'
$global:patchTestDirty = $false
$global:patchTestCalls = @()

# Use real Git for UTF-8 path output; mock all remote and publishing operations.
function git {
    $global:LASTEXITCODE = 0
    $gitArgs = @($args | Select-Object -Skip 4)
    $global:patchTestCalls += ,$gitArgs
    switch ($gitArgs[0]) {
        'rev-parse' {
            if ($gitArgs[1] -eq '--show-toplevel') { & git.exe rev-parse --show-toplevel } else { 'main' }
        }
        'remote' { $global:patchTestRemote }
        'status' { if ($global:patchTestDirty) { ' M src/config.ts' } }
        'rev-list' { '0' }
    }
}

function Assert-UploadCheck {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

try {
    $null = New-Item -ItemType Directory -Path (Join-Path $testRoot 'scripts') -Force
    & git.exe init --quiet $testRoot
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the temporary Git checkout.' }
    [Console]::OutputEncoding = [Text.Encoding]::GetEncoding(936)
    $fixtureScript = Join-Path $testRoot 'scripts/upload-patch.ps1'
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'upload-patch.ps1') -Destination $fixtureScript
    $sourceDirectory = Join-Path $testRoot 'source'
    $null = New-Item -ItemType Directory -Path $sourceDirectory
    $source = Join-Path $sourceDirectory 'patch v1.zip'
    $stream = [IO.File]::Create($source)
    $stream.SetLength(20MB)
    $stream.Dispose()

    $result = & $fixtureScript $source 6>&1
    Assert-UploadCheck ([Console]::OutputEncoding.CodePage -eq 936) 'Console encoding was not restored.'
    $target = Join-Path $testRoot 'public/downloads/patch v1.zip'
    Assert-UploadCheck ((Get-Item -LiteralPath $target).Length -eq 20MB) '20 MiB file was not copied completely.'
    Assert-UploadCheck (($result -join "`n").Contains('https://blog.yychess.top/downloads/patch%20v1.zip')) 'Download URL was not encoded.'
    Assert-UploadCheck (@($global:patchTestCalls | Where-Object { $_[0] -eq 'push' }).Count -eq 1) 'Expected exactly one push.'
    $add = @($global:patchTestCalls | Where-Object { $_[0] -eq 'add' })
    Assert-UploadCheck (($add[0] -join '|') -eq 'add|--|public/downloads/patch v1.zip') 'Git add included unexpected paths.'

    $global:patchTestCalls = @()
    $null = & $fixtureScript $source 6>&1
    Assert-UploadCheck (@($global:patchTestCalls | Where-Object { $_[0] -in @('add', 'commit', 'push') }).Count -eq 0) 'Duplicate file was not rejected.'
    Assert-UploadCheck ((Get-Item -LiteralPath $target).Length -eq 20MB) 'Existing patch was changed.'

    $oversize = Join-Path $sourceDirectory 'too-large.zip'
    $stream = [IO.File]::Create($oversize)
    $stream.SetLength(25MB + 1)
    $stream.Dispose()
    $global:patchTestCalls = @()
    $null = & $fixtureScript $oversize 6>&1
    Assert-UploadCheck ($global:patchTestCalls.Count -eq 0) 'Oversize file reached Git.'

    $global:patchTestRemote = 'https://github.com/example/other.git'
    $global:patchTestCalls = @()
    $null = & $fixtureScript $source 6>&1
    Assert-UploadCheck (@($global:patchTestCalls | Where-Object { $_[0] -in @('fetch', 'add', 'commit', 'push') }).Count -eq 0) 'Wrong repository was not rejected.'

    $global:patchTestRemote = 'https://github.com/yy487/my-blog.git'
    $global:patchTestDirty = $true
    $global:patchTestCalls = @()
    $null = & $fixtureScript $source 6>&1
    Assert-UploadCheck (@($global:patchTestCalls | Where-Object { $_[0] -in @('fetch', 'add', 'commit', 'push') }).Count -eq 0) 'Dirty checkout was not rejected.'
    Write-Host 'Uploader checks passed: Chinese Git path under CP936, console restoration, 20 MiB copy, URL encoding, duplicate, size, repository and local-edit protection.'
} finally {
    [Console]::OutputEncoding = $previousConsoleEncoding
    $tempPrefix = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    if (-not $resolvedTestRoot.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup target.' }
    if (Test-Path -LiteralPath $resolvedTestRoot) { Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force }
    Remove-Item Function:\git -ErrorAction SilentlyContinue
}
