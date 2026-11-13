@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js, then open START.bat again.
  pause
  exit /b 1
)
echo CodeQuiz: http://127.0.0.1:4173/
echo Keep this window open while using the website. Press Ctrl+C to stop.
node server.cjs
pause
