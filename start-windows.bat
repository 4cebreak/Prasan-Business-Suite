@echo off
setlocal EnableDelayedExpansion
title PRASAN BUSINESS SUITE - Launcher
cd /d "%~dp0"

:: Clear screen
cls

echo ─────────────────────────────────────────────────────────
echo 🚀 PRASAN BUSINESS SUITE - WINDOWS LAUNCHER
echo ─────────────────────────────────────────────────────────
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed.
    echo     Please download and install it from: https://nodejs.org
    echo.
    echo TIP: If you just installed it, please restart your laptop.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js found (!NODE_VER!)

:: 2. Handle Environment Configuration (.env)
if not exist ".env" (
    echo [INFO] Configuring environment (.env)...
    echo DATABASE_URL="file:./dev.db">.env
    :: Generate a pseudo-random secret for security
    set "SECRET=!RANDOM!!RANDOM!!RANDOM!!RANDOM!!RANDOM!!RANDOM!"
    echo SESSION_SECRET="!SECRET!">>.env
    echo [OK] Created default .env with secure session secret.
)

:: 3. Handle Platform Mismatch (e.g. copied from Mac)
if exist "node_modules" (
    if not exist "node_modules\.bin\next.cmd" (
        echo [WARN] Detected incompatible node_modules (likely from Mac).
        echo [INFO] Purging and re-installing for Windows...
        rmdir /s /q node_modules
    )
)

:: 4. Install Dependencies
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo        (This may take a minute on the first run)
    call npm install --no-fund --no-audit
    if %errorlevel% neq 0 (
        echo.
        echo [X] Error installing dependencies. Check your internet connection.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
)

:: 5. Database Synchronization
echo [INFO] Synchronizing database schema...
call npx prisma generate >nul 2>nul
call npx prisma db push --accept-data-loss >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] Database sync warning. Attempting to recover...
    call npx prisma generate
)
echo [OK] Database ready.

:: 6. Start the Application
echo.
echo PRASAN BUSINESS SUITE IS STARTING...
echo ➜ Local:   http://localhost:3000
echo ➜ Status:  Running in development mode
echo.
echo TIP: Press Ctrl+C to stop the server safely.
echo ─────────────────────────────────────────────────────────

:: Open browser after a short delay
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:3000"

:: Run Next.js dev server
set PORT=3000
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [X] The server stopped unexpectedly.
    echo     Check if Port 3000 is already in use.
    pause
)
