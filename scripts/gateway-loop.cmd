@echo off
rem Keeps the home gateway running: restart it if the process exits.
rem Installed copy: scripts\bootstrap-gateway.ps1 puts this file and orca-gateway.cjs
rem into %APPDATA%\orca-web, so the repo does not have to stay on the machine.
setlocal
set "ORCA_WEB_DIR=%APPDATA%\orca-web"
if not exist "%ORCA_WEB_DIR%" mkdir "%ORCA_WEB_DIR%"

:loop
node "%ORCA_WEB_DIR%\orca-gateway.cjs" --config "%ORCA_WEB_DIR%\gateway.json" >> "%ORCA_WEB_DIR%\gateway.log" 2>&1
timeout /t 10 /nobreak >nul
goto loop
