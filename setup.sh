#!/bin/bash
# Setup script for Guidewire Blink monorepo

set -e

echo "========================================"
echo "  Guidewire Blink - Setup Script"
echo "========================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

# Check for Python (optional, for backend)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    echo "✓ Python 3 found: $PYTHON_VERSION"
else
    echo "⚠ Python 3 not found (optional for backend services)"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install mobile app dependencies
echo "📱 Installing mobile app (frontend/mobile)..."
cd frontend/mobile
npm install
cd ../..

echo ""
echo "🌐 Installing web app (frontend/web)..."
if [ -d "frontend/web" ]; then
  cd frontend/web
  npm install
  cd ../..
else
  echo "⚠️  frontend/web not found; skipping web app install."
fi

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   cd frontend/mobile && cp .env.example .env"
echo ""
echo "2. Start development servers:"
echo "   - Mobile app:  cd frontend/mobile && npm start"
echo "   - Web app:     (skipped unless you add frontend/web)"
echo ""
echo "3. Read WORKSPACE.md for detailed instructions"
echo ""
