#!/bin/bash
set -e

echo "========================================"
echo "  Aegis - Unix Setup Script"
echo "========================================"

# Install Backend deps and setup DB
echo "🛠️ Setting up Backend & Database..."
cd backend
npm install
npx prisma db push --accept-data-loss
npx prisma generate
npx prisma db seed
cd ..

# Install Frontend deps
echo "📱 Installing mobile app dependencies..."
cd frontend/mobile
npm install
cd ../..

# Setup Python
echo "🐍 Preparing Python ML environment..."
if [ ! -d "ml-services/.venv" ]; then
    python3 -m venv ml-services/.venv
fi

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
