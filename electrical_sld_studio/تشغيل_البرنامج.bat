@echo off
rem Smart Grid SLD Studio Launcher
rem Copyright (C) ENG-MOSTAFAELMGHRABY

set "PROJECT_DIR=c:\Users\AL-Motahida\Documents\antigravity\charming-darwin\electrical_sld_studio"
set "PYTHON_EXE=C:\Python314\python.exe"

cd /d "%PROJECT_DIR%"

if exist "%PYTHON_EXE%" (
    start "" "%PYTHON_EXE%" app.py
) else (
    start "" python app.py
)