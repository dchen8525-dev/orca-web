@echo off
rem Keeps the home gateway running: restart it if the process exits.
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs

:loop
"C:\Program Files\nodejs\node.exe" apps\gateway\src\main.ts --config "%APPDATA%\orca-web\gateway.json" --local-orca >> logs\gateway.log 2>&1
timeout /t 10 /nobreak >nul
goto loop
