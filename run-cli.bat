@echo off
cd /d "%~dp0"
echo =====================================================
echo          Coding Agent Free — CLI Mode
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

echo  Type /help for available commands.
echo  Press Ctrl+C to exit.
echo.
echo =====================================================
echo.
node node_modules/ts-node/dist/bin.js src/agent.ts
echo.
echo  CLI stopped. Close this window or press any key.
pause >nul
