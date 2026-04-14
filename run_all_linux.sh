#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Locate docker-compose.yml
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
echo "STARTING RIDESAFE-AI DISTRIBUTED ENGINE (FIXED VERSION)"
echo "========================================================"
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
	echo "ERROR: Docker not running"
	exit 1
fi

# 🔥 CLEAN OLD PORTS (VERY IMPORTANT)
echo "Cleaning old ports..."
for port in 8000 8002 8003 8004; do
  fuser -k $port/tcp 2>/dev/null || true
done

# 🔥 STOP OLD CONTAINERS
echo "Stopping old containers..."
docker compose down

# 1. Start ONLY infra (NOT ML services)
echo "[1/10] Starting infra containers..."
cd "$PROJECT_DIR"
docker compose up -d kafka zookeeper redis timescaledb backend

echo "Waiting for containers..."
sleep 10

# Detect Kafka container
echo "Detecting Kafka container..."
KAFKA_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i kafka | head -n 1)

if [ -z "$KAFKA_CONTAINER" ]; then
	echo "ERROR: Kafka container not found"
	docker ps
	exit 1
fi

echo "Kafka container: $KAFKA_CONTAINER"

# Wait for Kafka readiness
echo "Checking Kafka readiness..."
until docker exec "$KAFKA_CONTAINER" bash -c "kafka-topics.sh --bootstrap-server localhost:9092 --list" > /dev/null 2>&1; do
	echo "Kafka not ready yet..."
	sleep 3
done

echo "Kafka is READY"

# Create topic
echo "[2/10] Creating Kafka topic..."
docker exec "$KAFKA_CONTAINER" kafka-topics.sh \
	--create \
	--if-not-exists \
	--topic aegis-events \
	--bootstrap-server localhost:9092 \
	--partitions 1 \
	--replication-factor 1

echo "Kafka topic ready"

# Show containers
echo "[3/10] Running containers:"
docker ps

# API config
echo "[4/10] Using fixed API IP..."
FIXED_IP="34.201.50.36"

FRONTEND_ENV_FILE="$PROJECT_DIR/frontend/mobile/.env"
FRONTEND_ENV_TMP="$PROJECT_DIR/frontend/mobile/.env.tmp"

if [ -f "$FRONTEND_ENV_FILE" ]; then
	grep -v "EXPO_PUBLIC_API_URL" "$FRONTEND_ENV_FILE" > "$FRONTEND_ENV_TMP"
else
	touch "$FRONTEND_ENV_TMP"
fi

echo "EXPO_PUBLIC_API_URL=http://$FIXED_IP:3001/api" >> "$FRONTEND_ENV_TMP"
mv "$FRONTEND_ENV_TMP" "$FRONTEND_ENV_FILE"

echo "✅ Expo will connect to: http://$FIXED_IP:3001/api"
echo ""

# Python venv
echo "[5/10] Setting up Python venv..."
if [ ! -f "$PROJECT_DIR/ml-calcultion/.venv/bin/activate" ]; then
	python3 -m venv "$PROJECT_DIR/ml-calcultion/.venv"
fi

"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install --upgrade pip

# Install dependencies
echo "[6/10] Installing Python dependencies..."
pip_path="$PROJECT_DIR/ml-calcultion/.venv/bin/pip"

$pip_path install -r "$PROJECT_DIR/ml-calcultion/ml-insurance-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/fraud-feature-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/h3-feature-service/requirements.txt"
$pip_path install -r "$PROJECT_DIR/ml-calcultion/grid_event_service/requirements.txt"

# Start ML services (LOCAL ONLY)
echo "[7/10] Starting ML services locally..."

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

# Backend
echo "[8/10] Starting backend..."
gnome-terminal -- bash -c "
export NVM_DIR=\$HOME/.nvm &&
source \$NVM_DIR/nvm.sh &&
cd '$PROJECT_DIR/backend' &&
npm install &&
npm run start:dev;
exec bash"

sleep 3

# Frontend
echo "[9/10] Starting mobile app..."
gnome-terminal -- bash -c "
export NVM_DIR=\$HOME/.nvm &&
source \$NVM_DIR/nvm.sh &&
cd '$PROJECT_DIR/frontend/mobile' &&
npm install &&
npx expo start --clear;
exec bash"

echo ""
echo "========================================================"
echo "ALL SERVICES RUNNING CLEANLY 🚀"
echo "========================================================"