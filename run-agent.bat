@echo off
cd /d "%~dp0"
echo =================================================
echo   Starting Coding Agent...
echo =================================================
echo.
node node_modules/ts-node/dist/bin.js src/agent.ts
echo.
pause
