@echo off
cd /d "%~dp0"
echo =====================================================
echo          Coding Agent Free
echo =====================================================
echo.
echo  First time? Run:  npm run setup
echo  Otherwise just wait for the agent to start...
echo.
echo  Tip: Pass --safe to restrict shell commands
echo       e.g.: npm start -- --safe
echo.
echo =====================================================
echo.
node node_modules/ts-node/dist/bin.js src/agent.ts %*
echo.
echo  Agent has exited. Close this window or press any key.
pause >nul
