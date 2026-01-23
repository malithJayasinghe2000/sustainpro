@echo off
REM ==========================================
REM SustainPro Windows Setup Fixer
REM ==========================================
REM Use this if you get EPERM errors with query_engine-windows.dll.node
REM Run this script as Administrator for best results.

echo.
echo 🔧 SustainPro Setup Fixer
echo =========================
echo.

echo 1. Stopping potential lock holders...
REM Attempt to kill Node processes that might be holding the lock
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 2. Cleaning problematic directories...
REM Force remove the specific prisma client folder causing locks
if exist "packages\shared-database\node_modules\.prisma" (
    rmdir /s /q "packages\shared-database\node_modules\.prisma"
    echo    - Cleaned .prisma directory
)
REM Sometimes cleaning the whole module folder is cleaner
if exist "packages\shared-database\node_modules" (
    rmdir /s /q "packages\shared-database\node_modules"
    echo    - Cleaned shared-database node_modules
)

echo.
echo 3. Re-installing dependencies...
REM This re-installs packages which re-downloads the fresh prisma engine
call npm install

echo.
echo 4. Restarting the local setup...
call scripts\setup-local.bat

echo.
echo  Fix attempt complete.
pause
