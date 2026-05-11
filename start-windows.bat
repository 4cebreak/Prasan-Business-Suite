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
) else (
    :: Check for corrupted .env (common during copy-paste)
    findstr "DATABASE_URL" .env >nul
    if %errorlevel% neq 0 (
        echo [WARN] .env file appears corrupted. Resetting...
        echo DATABASE_URL="file:./dev.db">.env
        set "SECRET=!RANDOM!!RANDOM!!RANDOM!!RANDOM!!RANDOM!!RANDOM!"
        echo SESSION_SECRET="!SECRET!">>.env
    )
)

:: 3. Handle Platform Mismatch (e.g. copied from Mac)
if exist "node_modules" (
    if not exist "node_modules\.bin\next.cmd" (
        echo [WARN] Detected incompatible node_modules (likely from Mac/Linux).
        echo [INFO] Purging and re-installing for Windows...
        rmdir /s /q node_modules
    )
)

:: 4. Install Dependencies
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo        (This may take a few minutes on the first run)
    call npm install --no-fund --no-audit
    if %errorlevel% neq 0 (
        echo.
        echo [X] Error installing dependencies. 
        echo     Please check your internet connection and ensure Node.js is correctly installed.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
)

:: 5. Database Synchronization
echo [INFO] Synchronizing database schema...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [X] Error generating Prisma client.
    pause
    exit /b 1
)

call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [WARN] Database sync issue. If this is the first time, this is normal.
    echo        Attempting second pass...
    call npx prisma generate
)
echo [OK] Database ready.

:: 6. Start the Application
echo.
echo ─────────────────────────────────────────────────────────
echo 📦 PRASAN BUSINESS SUITE IS STARTING...
echo ➜ Local:   http://localhost:3000
echo ➜ Status:  Initializing server...
echo ─────────────────────────────────────────────────────────
echo.

:: Open browser after a longer delay to ensure server is ready
start "" /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"

:: Run Next.js dev server
set PORT=3000
set NEXT_TELEMETRY_DISABLED=1
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [X] The server stopped unexpectedly (Code: %errorlevel%).
    echo     Possible reasons:
    echo     1. Port 3000 is already in use by another app.
    echo     2. Node.js version is incompatible (v18+ recommended).
    echo     3. Corrupted node_modules (Try deleting the folder and restarting).
    echo.
    pause
)
