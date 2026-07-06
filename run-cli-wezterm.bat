@echo off
cd /d "%~dp0"
echo =====================================================
echo          Coding Agent Free — CLI Mode (WezTerm)
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

echo  Launching WezTerm...
start "" wezterm.exe start -- node "%~dp0node_modules\ts-node\dist\bin.js" "%~dp0src\agent.ts"
echo.
echo  If WezTerm is not installed, download from: https://wezfurlong.org/wezterm/
echo.
pause
