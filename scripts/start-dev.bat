@echo off
echo Starting Academic Universe Development Environment...
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm run dev"
cd ..

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting up!
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:5000
echo.
echo To stop the servers, close the command prompt windows.
echo.
pause