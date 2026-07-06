@echo off
cd /d "%~dp0"
echo =====================================================
echo          Coding Agent Free — CLI Mode (RTL / WezTerm)
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

:: Find wezterm.exe
set "WEZTERM="
for %%p in (
    "%ProgramFiles%\WezTerm\wezterm.exe"
    "%ProgramFiles(x86)%\WezTerm\wezterm.exe"
    "%LocalAppData%\WezTerm\wezterm.exe"
    "%USERPROFILE%\scoop\apps\wezterm\current\wezterm.exe"
) do if exist %%p set "WEZTERM=%%~p"
if not defined WEZTERM for /f "delims=" %%a in ('where wezterm.exe 2^>nul') do set "WEZTERM=%%a"
if not defined WEZTERM (
    echo [ERROR] wezterm.exe not found.
    echo Install from: https://wezfurlong.org/wezterm/installation.html
    pause
    exit /b 1
)

echo  Found WezTerm at: %WEZTERM%
echo  Launching...
echo.

start "" "%WEZTERM%" --config bidi_enabled=true --config "bidi_direction=""AutoRightToLeft""" start -- "%~dp0scripts\wezterm-launcher.cmd"

echo.
echo  If the window closes immediately, run this to debug:
echo    node "%~dp0node_modules\ts-node\dist\bin.js" "%~dp0src\agent.ts"
echo.
pause
