#!/bin/bash

echo "======================================="
echo "🚀 Starting RideSafe-AI Magic Setup (macOS)..."
echo "======================================="
echo

# 1. Dynamically find the local IP address
echo "🔍 Detecting your local Wi-Fi IP address..."

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null)

# Fallback to en1 (some Macs use en1 for Wi-Fi)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ipconfig getifaddr en1 2>/dev/null)
fi

# Fallback: grab first non-loopback IPv4 from ifconfig
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not determine your local IP address. Make sure you are connected to Wi-Fi."
    exit 1
fi

echo "✅ Found Local IP: $LOCAL_IP"
echo

# 2. Setup Frontend .env dynamically
echo "🔧 Updating Mobile App configuration..."
FRONTEND_ENV_FILE="frontend/mobile/.env"

# Create directory if needed
mkdir -p "frontend/mobile"

# Remove existing EXPO_PUBLIC_API_URL line and append the new one
if [ -f "$FRONTEND_ENV_FILE" ]; then
    grep -v "EXPO_PUBLIC_API_URL" "$FRONTEND_ENV_FILE" > "${FRONTEND_ENV_FILE}.tmp"
    mv "${FRONTEND_ENV_FILE}.tmp" "$FRONTEND_ENV_FILE"
else
    touch "$FRONTEND_ENV_FILE"
fi

echo "EXPO_PUBLIC_API_URL=http://${LOCAL_IP}:3001/api" >> "$FRONTEND_ENV_FILE"

echo "✅ React Native set to connect to: http://${LOCAL_IP}:3001/api"
echo

# 3. Setup Backend & Database
echo "🛠️ Setting up Backend & Database..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🔗 Synchronizing Prisma Database Schema..."
npx prisma db push --accept-data-loss
npx prisma generate
echo "🌱 Seeding weekly plans and disruption events..."
npx prisma db seed
echo "✅ Database is ready!"
echo

# 4. Start both servers
echo "🔥 Starting Backend Servers..."

echo "🖥️ Starting NestJS Backend Server in a new Terminal window..."
# Opens a new Terminal window and runs the backend server in it
osascript -e 'tell application "Terminal" to do script "cd \"'"$(pwd)"'\" && npm run start:dev"'

echo "⏳ Waiting for backend to initialize..."
sleep 3

cd ..
cd frontend/mobile

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "📱 Starting Expo Go Server... (Scan the QR Code below!)"
echo "======================================="
npx expo start -c

echo
echo "🛑 Remember to close the separate Backend Terminal window when you're done!"