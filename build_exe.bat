@echo off
REM Compile PetiteDMX en un seul .exe (PyInstaller onefile).
REM Pre-requis : pip install pyinstaller
REM Le .exe sera cree dans dist\PetiteDMX.exe

cd /d "%~dp0"
if not exist "config\presets.json" (
    echo Attention : config\presets.json doit exister pour etre inclus dans l'exe.
)
python -m PyInstaller --noconfirm --clean PetiteDMX.spec
if %ERRORLEVEL% equ 0 (
    echo.
    echo OK : dist\PetiteDMX.exe
    echo Au premier lancement, un dossier config\ sera cree a cote de l'exe avec les presets.
) else (
    echo Echec du build.
    exit /b 1
)
