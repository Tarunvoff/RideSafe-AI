#!/bin/bash
set -e

# Aegis Unified Start Script (Unix)
# Consolidated for Linux and macOS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

echo "========================================================"
echo "🚀 STARTING AEGIS DISTRIBUTED ENGINE (UNIX)"
echo "========================================================"

cd "$PROJECT_ROOT"

# 1. Start Docker
echo "[1/8] Starting Docker containers..."
docker compose up -d

# 2. IP Detection and Frontend Env Sync
echo "[2/8] Syncing mobile app configuration..."

# Cross-platform IP Detection
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
else
    # Linux (handling multiple possible tools)
    LOCAL_IP=$(hostname -I | awk '{print $1}' || ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1 || echo "127.0.0.1")
fi

FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/mobile/.env"

if [ -f "$FRONTEND_ENV_FILE" ]; then
    # Portable sed removal (deletes existing line)
    sed -i.bak '/EXPO_PUBLIC_API_URL/d' "$FRONTEND_ENV_FILE" && rm -f "${FRONTEND_ENV_FILE}.bak"
else
    touch "$FRONTEND_ENV_FILE"
fi

echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3001/api" >> "$FRONTEND_ENV_FILE"
echo "✅ Backend configured at http://$LOCAL_IP:3001/api"

# 3. Setup Python Venv
echo "[3/8] Preparing Python virtual environment..."
if [ ! -f "$PROJECT_ROOT/ml-calcultion/.venv/bin/activate" ]; then
    python3 -m venv "$PROJECT_ROOT/ml-calcultion/.venv"
fi
source "$PROJECT_ROOT/ml-calcultion/.venv/bin/activate"
pip install --upgrade pip

# 4. Start ML Services (in background or new terminals)
echo "[4/8] Starting ML services..."
# Logic to detect terminal emulator (gnome-terminal, iterm, etc.) would go here
# For brevity, using background processes if no terminal is found

SERVICES=("ml-insurance-service:8000" "fraud-feature-service:8002" "grid_event_service:8003" "h3-feature-service:8004")

for SERVICE_INFO in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE PORT <<< "$SERVICE_INFO"
    echo "   - Launching $SERVICE on port $PORT"
    cd "$PROJECT_ROOT/ml-calcultion/$SERVICE"
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port $PORT --reload & 
done

# 5. Start Backend
echo "[5/8] Starting NestJS Backend..."
cd "$PROJECT_ROOT/backend"
npm install
npm run start:dev &

# 6. Start Mobile App
echo "[6/8] Starting Expo Mobile Application..."
cd "$PROJECT_ROOT/frontend/mobile"
npm install
npx expo start --clear &

echo ""
echo "========================================================"
echo "✅ ALL SERVICES RUNNING 🚀"
echo "========================================================"
wait
