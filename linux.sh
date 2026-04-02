#!/bin/bash

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
docker compose up -d

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

# 5. ML Insurance Service
echo "[3/8] Starting ML Insurance Service (8000)..."
gnome-terminal -- bash -c "
cd ml-calcultion &&
source .venv/bin/activate &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
cd ml-insurance-service &&
echo 'ML-INSURANCE-8000' &&
uvicorn main:app --host 0.0.0.0 --port 8000;
exec bash
"

# 6. Fraud Feature Service
echo "[4/8] Starting Fraud Feature Service (8002)..."
gnome-terminal -- bash -c "
cd ml-calcultion &&
source .venv/bin/activate &&
cd fraud-feature-service &&
export REDIS_URL=redis://127.0.0.1:6379/0 &&
export USE_REDIS=True &&
echo 'FRAUD-EXTRACTOR-8002' &&
uvicorn main:app --host 0.0.0.0 --port 8002 --reload;
exec bash
"

# 7. Grid Event Service
echo "[5/8] Starting Grid Event Service (8003)..."
gnome-terminal -- bash -c "
cd ml-calcultion &&
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

# 8. H3 Feature Service
echo "[6/8] Starting H3 Feature Service (8004)..."
gnome-terminal -- bash -c "
cd ml-calcultion &&
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
echo "[7/8] Starting NestJS Backend (3001)..."
gnome-terminal -- bash -c "
cd backend &&
echo 'NESTJS-BACKEND-3001' &&
npm run start:dev;
exec bash
"

sleep 3

# 10. React Native App
echo "[8/8] Starting Mobile App..."
gnome-terminal -- bash -c "
cd frontend/mobile &&
echo 'EXPO-MOBILE-APP' &&
npx expo start --offline;
exec bash
"

echo ""
echo "========================================================"
echo "✅ ALL MICROSERVICES LAUNCHED WITH KAFKA READY!"
echo "========================================================"