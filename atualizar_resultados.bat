@echo off
chcp 65001 >NUL
setlocal enabledelayedexpansion

REM === CONFIG ===
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%.venv\Scripts\python.exe"
set "SCRIPT_RES=%PROJECT_DIR%backend\scripts\update_results_sheets.py"

set "SHEET_NAME=Fundamentos Ações"
set "TAB_LUC=LUC LIQ"
set "TAB_PAT=PAT LIQ"
set "CRED_FILE=%PROJECT_DIR%service_account.json"

REM Força UTF-8 no Python
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

pushd "%PROJECT_DIR%"

echo Executando atualização de resultados trimestrais...
"%PYTHON_EXE%" "%SCRIPT_RES%" ^
  --sheet-name "%SHEET_NAME%" ^
  --tab-luc "%TAB_LUC%" ^
  --tab-pat "%TAB_PAT%" ^
  --cred-file "%CRED_FILE%"

popd
endlocal

REM Espera 5 segundos antes de fechar (compatível com redirecionamento de entrada)
ping 127.0.0.1 -n 6 >nul
