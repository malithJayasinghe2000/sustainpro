@echo off
title Restart Gateway
echo.
echo 🔄 Restarting SustainPro Gateway...
echo =================================
echo.

REM Go to docker folder
cd /d "%~dp0\..\docker"

echo Current Path: %CD%

echo Restarting gateway container...
docker-compose restart gateway

echo.
echo ✅ Gateway restarted.
echo Please reload your browser (Ctrl+R).
echo.
echo If the error persists:
echo 1. Ensure the backend script is running.
echo 2. Check http://localhost:8080/health in your browser.
echo.
pause
