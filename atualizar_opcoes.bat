@echo off
REM === Ativar o ambiente virtual e rodar o script ===

REM Caminho do Python (venv)
set PYTHON_EXE=C:\Users\Raphael Furlan\Desktop\Projetos\Dash - DOC\WiseFinan\.venv\Scripts\python.exe

REM Caminhos dos scripts
set SCRIPT_OPCOES=C:\Users\Raphael Furlan\Desktop\Projetos\Dash - DOC\WiseFinan\opcoes_to_sheets_rules.py

REM Executa opcoes_to_sheets_rules.py
echo Executando %SCRIPT_OPCOES% ...
"%PYTHON_EXE%" "%SCRIPT_OPCOES%"

REM Opcional: esperar 5 segundos para ver mensagens
timeout /t 5
