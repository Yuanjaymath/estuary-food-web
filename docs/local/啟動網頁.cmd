@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js。請先安裝 Node.js，再重新開啟此檔案。
  pause
  exit /b 1
)
node server.mjs --open
pause
