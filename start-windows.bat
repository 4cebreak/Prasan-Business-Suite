@echo off
setlocal EnableDelayedExpansion
title Prasan ERP
cd /d "%~dp0"

echo ======================================
echo        Prasan ERP - Starting...
echo ======================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo         Please install it from: https://nodejs.org
    echo.
    echo --------------------------------------------------
    echo TIP: If you just installed Node.js, please restart
    echo      the laptop and try again.
    echo --------------------------------------------------
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js found: %%v

:: 1. Auto-create .env if missing
if not exist ".env" (
    echo [INFO] Creating .env configuration file...
    echo DATABASE_URL="file:./dev.db">.env
    :: Generate a simple pseudo-random secret on Windows
    set "SECRET=!RANDOM!!RANDOM!!RANDOM!!RANDOM!"
    echo SESSION_SECRET="!SECRET!">>.env
)


:: 2. Check for node_modules platform mismatch
if exist "node_modules" (
    if not exist "node_modules\.bin\next.cmd" (
        echo [WARN] node_modules folder appears to be from a different OS [e.g. Mac].
        echo [INFO] Re-installing dependencies for Windows...
        rmdir /s /q node_modules
    )
)

:: 3. Install dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies [first time only]...
    echo        This may take a few minutes.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies.
        echo         Please check your internet connection.
        pause
        exit /b 1
    )
)

:: 4. Database Setup
echo [INFO] Synchronizing database schema...
call npx prisma generate >nul 2>nul
call npx prisma db push --accept-data-loss >nul 2>nul


echo.
echo [STARTING] Prasan ERP at http://localhost:3000
echo            Press Ctrl+C to stop the server.
echo.

:: Open browser after delay
start "" /b cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"

:: Start the dev server
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly.
    echo         Common reasons:
    echo         1. Port 3000 is already in use by another app.
    echo.
    pause
)
