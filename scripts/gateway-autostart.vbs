' Starts the gateway loop with no console window (template; scripts\bootstrap-gateway.ps1
' installs a copy into the user's Startup folder).
CreateObject("WScript.Shell").Run "cmd /c """"%APPDATA%\orca-web\gateway-loop.cmd""""", 0, False
