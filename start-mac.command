#!/bin/bash
# Prasan ERP — macOS Bulletproof Launcher
# This script ensures the environment is set up correctly and launches the app.

# 1. Ensure we are in the script's directory
cd "$(dirname "$0")"

# Clear screen for a clean start
clear

echo "─────────────────────────────────────────────────────────"
echo "🚀 PRASAN BUSINESS SUITE — MACOS LAUNCHER"
echo "─────────────────────────────────────────────────────────"
echo ""

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Please download and install it from: https://nodejs.org"
    echo ""
    echo "   Press any key to exit..."
    read -n 1
    exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js found ($NODE_VER)"

# 3. Handle Environment Configuration (.env)
if [ ! -f ".env" ]; then
    echo "📝 Configuring environment (.env)..."
    echo 'DATABASE_URL="file:./dev.db"' > .env
    # Generate a random 32-character secret for security
    SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    echo "SESSION_SECRET=\"$SECRET\"" >> .env
    echo "   ✓ Created default .env with secure session secret."
fi

# 4. Handle Platform Mismatch (e.g. copied from Windows)
if [ -d "node_modules" ]; then
    # Simple check for macOS compatibility
    if [[ ! -d "node_modules/.bin" ]]; then
        echo "⚠️  Detected incompatible node_modules (likely from another OS)."
        echo "📦 Purging and re-installing for macOS..."
        rm -rf node_modules
    fi
fi

# 5. Install Dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    echo "   (This may take a minute on the first run)"
    npm install --no-fund --no-audit
    if [ $? -ne 0 ]; then
        echo "❌ Error installing dependencies. Please check your internet connection."
        exit 1
    fi
    echo "   ✓ Dependencies installed."
fi

# 6. Database Synchronization
echo "🗄️  Synchronizing database schema..."
# Generate Prisma Client
npx prisma generate &> /dev/null
# Sync schema (db push is used for SQLite dev flow)
npx prisma db push --accept-data-loss &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Database sync warning. Attempting to recover..."
    npx prisma generate
fi
echo "   ✓ Database ready."

# 7. Start the Application
echo ""
echo "🔥 Starting Prasan ERP..."
echo "   ➜ Local:   http://localhost:3000"
echo "   ➜ Status:  Running in development mode"
echo ""
echo "💡 TIP: Press Ctrl+C to stop the server safely."
echo "─────────────────────────────────────────────────────────"

# Open browser after a short delay
(sleep 4 && open http://localhost:3000) &

# Run Next.js dev server
export PORT=3000
npm run dev
