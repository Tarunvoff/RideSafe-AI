#!/bin/bash

set -e

# Define colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${YELLOW}⚠ This script is optimized for macOS. Use linux.sh on Linux.${NC}"
fi

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+.${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}🚀 Starting RideSafe-AI Magic Setup...${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# 1. Dynamically find the local IP address (macOS)
echo -e "${YELLOW}🔍 Detecting your local Wi-Fi IP address...${NC}"

DEFAULT_IFACE=$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')
LOCAL_IP=""

if [ -n "$DEFAULT_IFACE" ]; then
    LOCAL_IP=$(ipconfig getifaddr "$DEFAULT_IFACE" 2>/dev/null || true)
fi

if [ -z "$LOCAL_IP" ]; then
    for iface in en0 en1; do
        LOCAL_IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
        if [ -n "$LOCAL_IP" ]; then
            break
        fi
    done
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Could not determine your local IP address on macOS. Connect to Wi-Fi/Ethernet and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}🌐 Found Local IP: $LOCAL_IP${NC}\n"

# 2. Setup Frontend .env dynamically
echo -e "${YELLOW}🔧 Updating Mobile App configuration...${NC}"
FRONTEND_DIR="frontend/mobile"
ENV_FILE="${FRONTEND_DIR}/.env"

if [ ! -d "$FRONTEND_DIR" ]; then
    mkdir -p "$FRONTEND_DIR"
fi
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Remove the old URL (if it exists) and add the current active IP address
grep -v "^EXPO_PUBLIC_API_URL=" "$ENV_FILE" > "${ENV_FILE}.tmp"
echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3001/api" >> "${ENV_FILE}.tmp"
mv "${ENV_FILE}.tmp" "$ENV_FILE"

echo -e "${GREEN}✅ React Native set to connect to: http://$LOCAL_IP:3001/api${NC}\n"

# 3. Setup Backend Database
echo -e "${YELLOW}🛠️ Setting up Backend & Database...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo -e "📦 Installing backend dependencies..."
    npm install
fi

echo -e "🔗 Synchronizing Prisma Database Schema..."
npx prisma db push --accept-data-loss
npx prisma generate
echo -e "${GREEN}✅ Database is ready!${NC}\n"

# 4. Start both servers together
echo -e "${YELLOW}🔥 Starting Backend & Frontend Servers...${NC}"

# Function to kill backend when we exit the script
cleanup() {
    echo -e "\n${RED}🛑 Shutting down both servers... Goodbye!${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit
}

# Catch Ctrl+C and run cleanup
trap cleanup INT

# Start backend in the background
echo -e "🖥️ Starting NestJS Backend Server (Background)..."
npm run start:dev &
BACKEND_PID=$!

# Wait a couple of seconds so the backend can initialize
sleep 3

# Go back to root and start frontend in foreground
cd ..

cd frontend/mobile
if [ ! -d "node_modules" ]; then
    echo -e "📦 Installing frontend dependencies..."
    npm install
fi

echo -e "📱 Starting Expo Go Server... (Scan the QR Code below!)"
echo -e "${BLUE}=======================================${NC}"
npx expo start -c
