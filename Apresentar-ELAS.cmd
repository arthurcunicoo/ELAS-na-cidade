@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24.3+ ou Node.js 26+ e abra este arquivo novamente.
  pause
  exit /b 1
)
node scripts/presentation.mjs
pause
