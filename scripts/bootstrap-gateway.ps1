# Install/upgrade the home gateway from a bundle: no npm, no repo runtime dependency.
# - bundles apps/gateway via esbuild (dev machine step)
# - installs orca-gateway.cjs + gateway-loop.cmd into %APPDATA%\orca-web
# - wires the Startup-folder vbs, restarts any in-flight gateway node process
# - never touches an existing %APPDATA%\orca-web\gateway.json (the admin page owns it)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

node -e "const [m] = process.versions.node.split('.').map(Number); process.exit(m >= 24 ? 0 : 1)"
if ($LASTEXITCODE -ne 0) { throw '需要 Node 24 或更高版本' }

npm run bundle
if ($LASTEXITCODE -ne 0) { throw 'bundle 失败' }

$dest = Join-Path $env:APPDATA 'orca-web'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Copy-Item 'dist-server\orca-gateway.cjs' (Join-Path $dest 'orca-gateway.cjs') -Force
Copy-Item 'scripts\gateway-loop.cmd' (Join-Path $dest 'gateway-loop.cmd') -Force

if (-not (Test-Path (Join-Path $dest 'gateway.json'))) {
  $port = 8790
  $cfg = [ordered]@{ serverUrl = ''; gatewayKey = ''; gatewayId = $env:COMPUTERNAME; admin = @{ port = $port } }
  $cfg | ConvertTo-Json | Set-Content (Join-Path $dest 'gateway.json') -Encoding UTF8
  Write-Host "新配置已写入 $dest\gateway.json（已留空：下一步会说明）"
}

$vbsPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'orca-web-gateway.vbs'
@'
' Starts the gateway loop with no console window (written by scripts\bootstrap-gateway.ps1).
CreateObject("WScript.Shell").Run "cmd /c """"%APPDATA%\orca-web\gateway-loop.cmd""""", 0, False
'@ -replace '%APPDATA%', $env:APPDATA | Set-Content $vbsPath -Encoding ASCII

# An old gateway (source-run, another bundle, or its keep-alive loop) must all go;
# a surviving loop would resurrect the old process ten seconds after each stop.
foreach ($p in (Get-CimInstance Win32_Process -Filter "Name='cmd.exe' or Name='node.exe'")) {
  $cl = $p.CommandLine
  if ($cl -and ($cl -match 'gateway-loop\.cmd' -or $cl -match 'apps\\gateway\\src\\main\.ts' -or $cl -match 'orca-gateway\.cjs')) {
    Write-Host ("停止旧 gateway 进程 PID {0}: {1}" -f $p.ProcessId, $cl)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

Start-Process 'wscript.exe' -ArgumentList ('"' + $vbsPath + '"') -WindowStyle Hidden
$admin = 'http://127.0.0.1:8790'
Write-Host "gateway 已安装并启动：$dest\orca-gateway.cjs"
Write-Host "管理页：$admin （hub 地址 / gatewayKey / orca://pair 配对码都在这里填）"
Start-Process $admin
