param([string]$FilePath)

$ErrorActionPreference = 'Stop'

function Invoke-PatchGit {
    param([string[]]$GitArguments)
    $previousErrorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $gitOutput = & git -c credential.helper= -c 'credential.helper=!gh auth git-credential' @GitArguments 2>&1
        $gitExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }
    if ($gitExitCode -ne 0) {
        throw ($gitOutput -join [Environment]::NewLine)
    }
    $gitOutput
}

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $repositoryRoot
try {
    if (-not $FilePath) {
        Add-Type -AssemblyName System.Windows.Forms
        $picker = New-Object System.Windows.Forms.OpenFileDialog
        $picker.Title = '选择要公开发布的游戏补丁（单文件不超过25 MiB）'
        $picker.Filter = '补丁压缩包|*.zip;*.7z;*.rar;*.gz;*.xz'
        if ($picker.ShowDialog() -ne 'OK') { return }
        $FilePath = $picker.FileName
        $picker.Dispose()
    }

    $patch = Get-Item -LiteralPath $FilePath
    if ($patch.PSIsContainer -or $patch.Extension.ToLowerInvariant() -notin @('.zip', '.7z', '.rar', '.gz', '.xz')) {
        throw '请选择 zip、7z、rar、gz 或 xz 压缩包。'
    }
    if ($patch.Length -eq 0 -or $patch.Length -gt 25MB) {
        throw '文件必须大于0字节，且不超过25 MiB；更大的补丁请使用外部下载链接。'
    }
    if ($patch.Name.IndexOfAny([char[]]'#%') -ge 0) {
        throw '文件名请避免 # 和 %，建议使用游戏名和版本号。'
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue) -or -not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw '需要已安装的 Git 和 GitHub CLI（gh）。'
    }
    $checkout = (Invoke-PatchGit @('rev-parse', '--show-toplevel')).Trim()
    if ([IO.Path]::GetFullPath($checkout) -ne $repositoryRoot) { throw '无法确认博客仓库路径。' }
    if ((Invoke-PatchGit @('rev-parse', '--abbrev-ref', 'HEAD')).Trim() -ne 'main') { throw '请先切换到博客的 main 分支。' }
    $remote = (Invoke-PatchGit @('remote', 'get-url', 'origin')).Trim()
    if ($remote -notmatch '^(https://github\.com/yy487/my-blog(?:\.git)?|git@github\.com:yy487/my-blog(?:\.git)?)$') {
        throw 'origin 不是 yy487/my-blog，为防止传错仓库已停止。'
    }
    if (@(Invoke-PatchGit @('status', '--porcelain')).Count -ne 0) {
        throw '博客目录有未提交的修改，请先保存或提交这些修改后再上传。'
    }

    $env:GIT_TERMINAL_PROMPT = '0'
    $env:GCM_INTERACTIVE = 'never'
    Write-Host '正在同步博客仓库…'
    $null = Invoke-PatchGit @('fetch', 'origin', 'main')
    if ([int](Invoke-PatchGit @('rev-list', '--count', 'origin/main..HEAD')) -ne 0) {
        throw '本地有尚未上传的提交，请先完成上传后再添加补丁。'
    }
    $null = Invoke-PatchGit @('merge', '--ff-only', 'origin/main')

    $relativePath = 'public/downloads/' + $patch.Name
    $destination = Join-Path $repositoryRoot $relativePath
    if (Test-Path -LiteralPath $destination) { throw '同名补丁已存在，请给新版补丁使用新文件名，例如加上版本号。' }
    $null = New-Item -ItemType Directory -Path (Join-Path $repositoryRoot 'public/downloads') -Force
    Copy-Item -LiteralPath $patch.FullName -Destination $destination
    $null = Invoke-PatchGit @('add', '--', $relativePath)
    $null = Invoke-PatchGit @('commit', '-m', ('Upload patch ' + $patch.Name), '--', $relativePath)
    Write-Host '正在上传补丁…'
    $null = Invoke-PatchGit @('push', 'origin', 'HEAD:main')

    Write-Host '上传完成！等待 Cloudflare 部署后，下载链接为：' -ForegroundColor Green
    Write-Host ('https://blog.yychess.top/downloads/' + [Uri]::EscapeDataString($patch.Name))
    Write-Host '在 Pages CMS 编辑文章，在「补丁下载」里选择这个文件，也可以把上面的链接直接插入正文。'
} catch {
    Write-Host ('上传未完成：' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '请保留窗口中的错误信息，方便继续处理。'
    exit 1
} finally {
    Pop-Location
}
