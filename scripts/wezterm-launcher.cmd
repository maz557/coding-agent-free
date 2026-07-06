@echo off
cd /d "%~dp0.."
echo === Coding Agent Free ===
echo.

node "%~dp0..\node_modules\ts-node\dist\bin.js" "%~dp0..\src\agent.ts"

echo.
if errorlevel 1 (
    echo Agent exited with code %errorlevel%.
) else (
    echo Agent exited normally.
)
echo Press any key to close this window.
pause >nul
