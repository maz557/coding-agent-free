@echo off
cd /d "%~dp0"
for /f "usebackq tokens=*" %%v in (`powershell -NoProfile -Command "Get-Content '%~dp0package.json' | ConvertFrom-Json | Select -ExpandProperty version"`) do set VERSION=%%v
echo =====================================================
echo          Coding Agent Free — Web Interface  v%VERSION%
echo =====================================================
echo.

echo [cleanup] Killing previous instances...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1 && echo [cleanup] Killed process on port 3000 (PID: %%a)
)
for /f "tokens=2 delims=," %%a in ('tasklist /fi "imagename eq node.exe" /fo csv /nh 2^>nul') do (
    for /f "delims=" %%b in ('wmic process where "processid=%%~a" get commandline 2^>nul ^| findstr /i "server.ts agent.ts"') do (
        taskkill /f /pid %%a >nul 2>&1 && echo [cleanup] Killed node process (PID: %%a)
    )
)
echo.

echo  Open http://localhost:3000 in your browser.
echo  Press Ctrl+C in this window to stop the server.
echo.
echo =====================================================
echo.
node node_modules/ts-node/dist/bin.js src/server.ts
echo.
echo  Server stopped. Close this window or press any key.
pause >nul
