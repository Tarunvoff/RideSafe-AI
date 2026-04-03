#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================================"
echo "🚀 STARTING RIDESAFE-AI DISTRIBUTED ENGINE (PHASE 2)"
echo "========================================================"
echo ""

# ✅ Ensure Docker is accessible
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not accessible. Please ensure:"
  echo "   - Docker is running"
  echo "   - Your user is in docker group"
  exit 1
fi

# 1. Boot Docker Containers
echo "[1/8] Booting Docker Containers (Kafka, Zookeeper, Redis, DB)..."
pushd "$SCRIPT_DIR" > /dev/null
docker compose up -d
popd > /dev/null

echo "⏳ Waiting for Kafka to initialize..."
sleep 10

# 2. Wait until Kafka is READY (important 🔥)
echo "🔍 Checking Kafka readiness..."

until docker exec aegis-kafka-1 bash -c \
"kafka-topics.sh --bootstrap-server localhost:9092 --list"
do
  echo "⏳ Kafka not ready yet..."
  sleep 3
done

echo "✅ Kafka is READY!"

# 3. Create topic if not exists
echo "[2/8] Ensuring Kafka topic exists..."

docker exec aegis_kafka_1 kafka-topics.sh \
  --create \
  --if-not-exists \
  --topic aegis-events \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1

echo "✅ Kafka topic ready"

# 4. Show running containers
echo "🔍 Running containers:"
docker ps

# 5. Create + activate Python virtual environment (once)
echo "[3/8] Preparing Python virtual environment..."
if [ ! -f "$SCRIPT_DIR/ml-calcultion/.venv/bin/activate" ]; then
  echo "Creating .venv under $SCRIPT_DIR/ml-calcultion"
  python3 -m venv "$SCRIPT_DIR/ml-calcultion/.venv"
fi

"$SCRIPT_DIR/ml-calcultion/.venv/bin/pip" install --upgrade pip

# 6. Install Python dependencies for each ML service
echo "[4/8] Installing Python dependencies..."
"$SCRIPT_DIR/ml-calcultion/.venv/bin/pip" install -r "$SCRIPT_DIR/ml-calcultion/ml-insurance-service/requirements.txt"
"$SCRIPT_DIR/ml-calcultion/.venv/bin/pip" install -r "$SCRIPT_DIR/ml-calcultion/fraud-feature-service/requirements.txt"
"$SCRIPT_DIR/ml-calcultion/.venv/bin/pip" install -r "$SCRIPT_DIR/ml-calcultion/h3-feature-service/requirements.txt"
"$SCRIPT_DIR/ml-calcultion/.venv/bin/pip" install -r "$SCRIPT_DIR/ml-calcultion/grid_event_service/requirements.txt"

# 7. ML Insurance Service
echo "[5/8] Starting ML Insurance Service (8000)..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/ml-calcultion' &&
source .venv/bin/activate &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
cd ml-insurance-service &&
echo 'ML-INSURANCE-8000' &&
uvicorn main:app --host 0.0.0.0 --port 8000 --reload;
exec bash
"

# 8. Fraud Feature Service
echo "[6/8] Starting Fraud Feature Service (8002)..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/ml-calcultion' &&
source .venv/bin/activate &&
cd fraud-feature-service &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
export USE_REDIS=True &&
echo 'FRAUD-EXTRACTOR-8002' &&
uvicorn main:app --host 0.0.0.0 --port 8002 --reload;
exec bash
"

# 9. Grid Event Service
echo "[7/8] Starting Grid Event Service (8003)..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/ml-calcultion' &&
source .venv/bin/activate &&
cd grid_event_service &&
export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092 &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
export ML_SERVICE_URL=http://127.0.0.1:8000 &&
export H3_FEATURE_SERVICE_URL=http://127.0.0.1:8004 &&
export USE_REDIS=True &&
echo 'GRID-EVENT-8003' &&
uvicorn main:app --host 0.0.0.0 --port 8003 --reload;
exec bash
"

# 10. H3 Feature Service
echo "[8/8] Starting H3 Feature Service (8004)..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/ml-calcultion' &&
source .venv/bin/activate &&
cd h3-feature-service &&
export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092 &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
export ML_INSURANCE_SERVICE_URL=http://127.0.0.1:8000 &&
export STRICT_REALTIME=true &&
echo 'H3-FEATURE-8004' &&
uvicorn main:app --host 0.0.0.0 --port 8004 --reload;
exec bash
"

echo "⏳ Waiting before starting backend..."
sleep 5

# 9. NestJS Backend (AFTER Kafka READY 🔥)
echo "[9/9] Starting NestJS Backend (3001)..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/backend' &&
npm install &&
echo 'NESTJS-BACKEND-3001' &&
npm run start:dev;
exec bash
"

sleep 3

# 10. React Native App
echo "[10/10] Starting Mobile App..."
gnome-terminal -- bash -c "
cd '$SCRIPT_DIR/frontend/mobile' &&
npm install &&
echo 'EXPO-MOBILE-APP' &&
npx expo start --offline;
exec bash
"

echo ""
echo "========================================================"
echo "✅ ALL MICROSERVICES LAUNCHED WITH KAFKA READY!"
echo "========================================================"