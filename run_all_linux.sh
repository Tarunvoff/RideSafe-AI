#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
	for d in "$SCRIPT_DIR"/*; do
		if [ -f "$d/docker-compose.yml" ]; then
			PROJECT_DIR="$d"
			break
		fi
	done
fi

if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
	echo "ERROR: Could not find docker-compose.yml"
	exit 1
fi

echo "========================================================"
echo "STARTING RIDESAFE-AI DISTRIBUTED ENGINE (PHASE 2)"
echo "========================================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
	echo "ERROR: Docker not running"
	exit 1
fi

# 1. Start Docker containers
echo "[1/10] Starting Docker containers..."
cd "$PROJECT_DIR"
docker compose up -d

echo "Waiting for containers..."
sleep 10

# 🔥 AUTO-DETECT KAFKA CONTAINER
echo "Detecting Kafka container..."
KAFKA_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i kafka | head -n 1)

if [ -z "$KAFKA_CONTAINER" ]; then
	echo "ERROR: Kafka container not found"
	docker ps
	exit 1
fi

echo "Kafka container: $KAFKA_CONTAINER"

# 2. Wait for Kafka readiness
echo "Checking Kafka readiness..."
until docker exec "$KAFKA_CONTAINER" bash -c "kafka-topics.sh --bootstrap-server localhost:9092 --list" > /dev/null 2>&1; do
	echo "Kafka not ready yet..."
	sleep 3
done

echo "Kafka is READY"

# 3. Create topic
echo "[2/10] Creating Kafka topic..."
docker exec "$KAFKA_CONTAINER" kafka-topics.sh \
	--create \
	--if-not-exists \
	--topic aegis-events \
	--bootstrap-server localhost:9092 \
	--partitions 1 \
	--replication-factor 1

echo "Kafka topic ready"

# 4. Show containers
echo "[3/10] Running containers:"
docker ps

# 🔥 ==============================
# 🔥 OAUTH FIX STARTS HERE
# 🔥 ==============================

echo "[4/10] Detecting local IP address..."

LOCAL_IP=$(hostname -I | awk '{print $1}')

# fallback method
if [ -z "$LOCAL_IP" ]; then
	LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}')
fi

if [ -z "$LOCAL_IP" ]; then
	echo "ERROR: Could not determine local IP"
	exit 1
fi

echo "✅ Local IP detected: $LOCAL_IP"
echo ""

echo "[5/10] Updating frontend .env..."

FRONTEND_ENV_FILE="$PROJECT_DIR/frontend/mobile/.env"
FRONTEND_ENV_TMP="$PROJECT_DIR/frontend/mobile/.env.tmp"

if [ -f "$FRONTEND_ENV_FILE" ]; then
	grep -v "EXPO_PUBLIC_API_URL" "$FRONTEND_ENV_FILE" > "$FRONTEND_ENV_TMP"
else
	touch "$FRONTEND_ENV_TMP"
fi

echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3001/api" >> "$FRONTEND_ENV_TMP"

mv "$FRONTEND_ENV_TMP" "$FRONTEND_ENV_FILE"

echo "✅ Expo will connect to: http://$LOCAL_IP:3001/api"
echo ""

# 🔥 ==============================
# 🔥 OAUTH FIX ENDS HERE
# 🔥 ==============================

# 6. Setup Python venv
echo "[6/10] Setting up Python venv..."
if [ ! -f "$PROJECT_DIR/ml-calcultion/.venv/bin/activate" ]; then
	python3 -m venv "$PROJECT_DIR/ml-calcultion/.venv"
fi

"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install --upgrade pip

# 7. Install dependencies
echo "[7/10] Installing Python dependencies..."
pip_path="$PROJECT_DIR/ml-calcultion/.venv/bin/pip"

$pip_path install -r "$PROJECT_DIR/ml-calcultion/ml-insurance-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/fraud-feature-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/h3-feature-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/grid_event_service/requirements.txt"

# 8. Start ML services
echo "[8/10] Starting ML services..."

gnome-terminal -- bash -c "
cd '$PROJECT_DIR/ml-calcultion' && source .venv/bin/activate &&
cd ml-insurance-service &&
uvicorn main:app --host 0.0.0.0 --port 8000 --reload;
exec bash"

gnome-terminal -- bash -c "
cd '$PROJECT_DIR/ml-calcultion' && source .venv/bin/activate &&
cd fraud-feature-service &&
uvicorn main:app --host 0.0.0.0 --port 8002 --reload;
exec bash"

gnome-terminal -- bash -c "
cd '$PROJECT_DIR/ml-calcultion' && source .venv/bin/activate &&
cd grid_event_service &&
uvicorn main:app --host 0.0.0.0 --port 8003 --reload;
exec bash"

gnome-terminal -- bash -c "
cd '$PROJECT_DIR/ml-calcultion' && source .venv/bin/activate &&
cd h3-feature-service &&
uvicorn main:app --host 0.0.0.0 --port 8004 --reload;
exec bash"

sleep 5

# 9. Start backend
echo "[9/10] Starting backend..."
gnome-terminal -- bash -c "
export NVM_DIR=\$HOME/.nvm &&
source \$NVM_DIR/nvm.sh &&
cd '$PROJECT_DIR/backend' &&
npm install &&
npm run start:dev;
exec bash"

sleep 3

# 10. Start mobile app
echo "[10/10] Starting mobile app..."
gnome-terminal -- bash -c "
export NVM_DIR=\$HOME/.nvm &&
source \$NVM_DIR/nvm.sh &&
cd '$PROJECT_DIR/frontend/mobile' &&
npm install &&
npx expo start --clear;
exec bash"

echo ""
echo "========================================================"
echo "ALL SERVICES RUNNING 🚀"
echo "========================================================"