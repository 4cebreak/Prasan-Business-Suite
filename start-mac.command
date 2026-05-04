#!/bin/bash
# Prasan ERP — macOS Launcher
# Double-click this file to start the application

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════╗"
echo "║       Prasan ERP — Starting...       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Please install it from: https://nodejs.org"
    echo ""
    echo "   Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✓ Node.js found: $(node -v)"

# 1. Auto-create .env if missing
if [ ! -f ".env" ]; then
    echo "📝 Creating .env configuration file..."
    echo 'DATABASE_URL="file:./dev.db"' > .env
    # Generate a random 32-character secret
    SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    echo "SESSION_SECRET=\"$SECRET\"" >> .env
fi


# 2. Check for node_modules platform mismatch
if [ -d "node_modules" ]; then
    if [ ! -f "node_modules/.bin/next" ]; then
        echo "⚠️  node_modules folder appears to be from a different OS (e.g. Windows)."
        echo "📦 Re-installing dependencies for macOS..."
        rm -rf node_modules
    fi
fi

# 3. Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (first time only)..."
    npm install
fi

# 4. Database Setup
echo "🗄️  Checking database schema..."
npx prisma generate &> /dev/null
npx prisma db push --accept-data-loss &> /dev/null


echo ""
echo "🚀 Starting Prasan ERP..."
echo "   Opening in your browser at http://localhost:3000"
echo "   Press Ctrl+C to stop the server."
echo ""

# Open browser after a short delay
(sleep 5 && open http://localhost:3000) &

# Start the dev server
npm run dev
