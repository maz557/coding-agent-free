@echo off
cd /d "%~dp0"
echo =====================================================
echo          Coding Agent Free — Web Interface
echo =====================================================
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
