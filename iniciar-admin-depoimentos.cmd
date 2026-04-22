@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if not errorlevel 1 (
  node tools\admin-server.js
  goto :fim
)

if exist "C:\nvm4w\nodejs\node.exe" (
  "C:\nvm4w\nodejs\node.exe" tools\admin-server.js
  goto :fim
)

echo Nao foi possivel encontrar o Node.js neste computador.
echo Peça ajuda para abrir o administrador de depoimentos.

:fim
pause
