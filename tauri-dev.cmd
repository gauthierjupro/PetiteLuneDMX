@echo off
setlocal
cd /d "%~dp0"

echo [tauri-dev] Arret de l'instance existante (si presente)...
taskkill /F /IM petitelunedmx-tauri.exe /T /FI "STATUS eq RUNNING" >NUL 2>&1
if errorlevel 1 (
  echo [tauri-dev] Aucune instance en cours.
) else (
  echo [tauri-dev] Instance arretee.
)

echo [tauri-dev] Lancement de npm run tauri dev...
call npm run tauri dev
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% neq 0 (
  echo.
  echo [tauri-dev] Echec (code %EXIT_CODE%).
  pause
)

exit /b %EXIT_CODE%
