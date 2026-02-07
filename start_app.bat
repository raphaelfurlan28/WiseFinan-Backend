@echo off
echo Starting WiseFinan...

:: Start Backend
echo Starting Backend Server...
start "WiseFinan Backend" cmd /k "cd backend && ..\.venv\Scripts\python.exe app.py"

:: Start Frontend
echo Starting Frontend...
start "WiseFinan Frontend" cmd /k "cd frontend && npm run dev"

echo Application launched.
