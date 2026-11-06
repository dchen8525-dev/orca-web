# Install/upgrade the home gateway:
# - default: bundle from this repo (needs Node 24 + npm on the dev machine)
# - -FromRelease: download the standalone exe from the GitHub release (no Node anywhere)
# - installs into %APPDATA%\orca-web, wires the Startup-folder vbs, restarts any
#   in-flight gateway process, never touches an existing gateway.json (the admin page owns it)
# Order matters: the new binary is staged and downloaded BEFORE killing the running
# gateway — orca-gateway.exe is locked while its process runs, so the copy into
# %APPDATA% must happen after the stop step, not before it.
param([switch]$FromRelease)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$releaseUrl = 'https://github.com/dchen8525-dev/orca-web/releases/latest/download/orca-gateway-windows-x64.exe'
$dest = Join-Path $env:APPDATA 'orca-web'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$staged = @{}
if ($FromRelease) {
  $stagedExe = Join-Path $env:TEMP 'orca-gateway-release.exe'
  Write-Host "下载自包含 exe（约 110MB）: $releaseUrl"
  Invoke-WebRequest -Uri $releaseUrl -OutFile $stagedExe -UseBasicParsing
  if ((Get-Item $stagedExe).Length -lt 50MB) {
    throw '下载的 exe 大小不对，疑似不是最新 release'
  }
  Write-Host "下载完成，等待替换在运行的 gateway"
  $staged['orca-gateway.exe'] = $stagedExe
} else {
  node -e "const [m] = process.versions.node.split('.').map(Number); process.exit(m >= 24 ? 0 : 1)"
  if ($LASTEXITCODE -ne 0) { throw '需要 Node 24 或更高版本（或改用 -FromRelease 走下载路径）' }

  npm run bundle
  if ($LASTEXITCODE -ne 0) { throw 'bundle 失败' }
  $staged['orca-gateway.cjs'] = (Resolve-Path 'dist-server\orca-gateway.cjs').Path
}
$staged['gateway-loop.cmd'] = (Resolve-Path 'scripts\gateway-loop.cmd').Path

if (-not (Test-Path (Join-Path $dest 'gateway.json'))) {
  $port = 8790
  $cfg = [ordered]@{ serverUrl = ''; gatewayKey = ''; gatewayId = $env:COMPUTERNAME; admin = @{ port = $port } }
  $cfgJson = $cfg | ConvertTo-Json
  # BOM-less UTF-8 on purpose: Windows PowerShell 5.1's `Set-Content -Encoding UTF8`
  # prepends a BOM, which JSON.parse in the gateway rejects.
  [System.IO.File]::WriteAllText((Join-Path $dest 'gateway.json'), $cfgJson, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "新配置已写入 $dest\gateway.json（已留空：下一步会说明）"
}

$vbsPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'orca-web-gateway.vbs'
@'
' Starts the gateway loop with no console window (written by scripts\bootstrap-gateway.ps1).
CreateObject("WScript.Shell").Run "cmd /c """"%APPDATA%\orca-web\gateway-loop.cmd""""", 0, False
'@ -replace '%APPDATA%', $env:APPDATA | Set-Content $vbsPath -Encoding ASCII

# An old gateway (source-run, bundle, exe, or its keep-alive loop) must all go;
# a surviving loop would resurrect the old process ten seconds after each stop.
# The running release exe is its own process name — it must be in this list too,
# or %APPDATA%\orca-web\orca-gateway.exe stays locked and the swap throws.
foreach ($p in (Get-CimInstance Win32_Process -Filter "Name='cmd.exe' or Name='node.exe' or Name='orca-gateway.exe'")) {
  $cl = $p.CommandLine
  if ($cl -and ($cl -match 'gateway-loop\.cmd' -or $cl -match 'apps\\gateway\\src\\main\.ts' -or $cl -match 'orca-gateway\.cjs' -or $cl -match 'orca-gateway\.exe')) {
    Write-Host ("停止旧 gateway 进程 PID {0}: {1}" -f $p.ProcessId, $cl)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

# Now nothing holds %APPDATA%\orca-web\* locked: swap everything into place.
foreach ($name in $staged.Keys) {
  Copy-Item $staged[$name] (Join-Path $dest $name) -Force
}

Start-Process 'wscript.exe' -ArgumentList ('"' + $vbsPath + '"') -WindowStyle Hidden
$admin = 'http://127.0.0.1:8790'
$installedName = if ($staged.ContainsKey('orca-gateway.exe')) { 'orca-gateway.exe' } else { 'orca-gateway.cjs' }
Write-Host "gateway 已安装并启动；管理页：$admin （hub 地址 / gatewayKey / orca://pair 配对码都在这里填）"
Write-Host "运行文件：$dest\$installedName；未来小版本可直接在该页面检查更新，不必再跑本脚本。"
Start-Process $admin
