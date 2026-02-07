@echo off
echo Installing dependencies using 'py' launcher...
py -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo 'py' command failed. Trying 'python'...
    python -m pip install -r requirements.txt
)
echo.
echo Dependencies installation attempt finished.
echo Please RESTART your backend server now.
pause
