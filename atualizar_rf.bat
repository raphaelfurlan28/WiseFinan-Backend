@echo off
chcp 65001 >NUL
setlocal enabledelayedexpansion

REM === CONFIG ===
set "PROJECT_DIR=%~dp0"
set "PYTHON_EXE=%PROJECT_DIR%.venv\Scripts\python.exe"
set "SCRIPT_TD=%PROJECT_DIR%backend\scripts\td_to_sheets.py"

REM *** Nomes com acento OK com UTF-8 ***
set "SHEET_NAME=Fundamentos Ações"
set "TAB_DIARIO=TD_Diario"
set "TAB_HIST=Historico"
set "CRED_FILE=%PROJECT_DIR%\service_account.json"

REM Força UTF-8 no Python
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

pushd "%PROJECT_DIR%"

"%PYTHON_EXE%" "%SCRIPT_TD%" --force-selenium --debug ^
  --sheet-name "%SHEET_NAME%" ^
  --tab-diario "%TAB_DIARIO%" ^
  --tab-hist "%TAB_HIST%" ^
  --cred-file "%CRED_FILE%"

popd
endlocal
