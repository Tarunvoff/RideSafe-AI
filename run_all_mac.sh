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
  echo "ERROR: Could not find docker-compose.yml in this folder or its direct subfolders."
  exit 1
fi

# Define colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! command -v node >/dev/null 2>&1; then
	echo -e "${RED}ERROR: Node.js is not installed. Please install Node.js 18+.${NC}"
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo -e "${RED}ERROR: npm is not installed. Please install npm.${NC}"
	exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
	echo -e "${RED}ERROR: Python 3 is not installed. Please install Python 3.10+.${NC}"
	exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Starting RideSafe-AI Magic Setup...${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# 1. Dynamically find the local IP address (macOS)
echo -e "${YELLOW}Detecting your local Wi-Fi IP address...${NC}"

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
	echo -e "${RED}ERROR: Could not determine your local IP address. Connect to Wi-Fi/Ethernet and try again.${NC}"
	exit 1
fi

echo -e "${GREEN}Found Local IP: $LOCAL_IP${NC}\n"

# 2. Setup Frontend .env dynamically
echo -e "${YELLOW}Updating Mobile App configuration...${NC}"
FRONTEND_DIR="$PROJECT_DIR/frontend/mobile"
ENV_FILE="${FRONTEND_DIR}/.env"

mkdir -p "$FRONTEND_DIR"
touch "$ENV_FILE"

grep -v "^EXPO_PUBLIC_API_URL=" "$ENV_FILE" > "${ENV_FILE}.tmp"
echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:3001/api" >> "${ENV_FILE}.tmp"
mv "${ENV_FILE}.tmp" "$ENV_FILE"

echo -e "${GREEN}React Native set to connect to: http://$LOCAL_IP:3001/api${NC}\n"

# 3. Boot Docker Containers
echo -e "${YELLOW}Booting Docker Containers (Kafka, Zookeeper, Redis)...${NC}"
pushd "$PROJECT_DIR" > /dev/null
docker compose up -d
popd > /dev/null

echo -e "${YELLOW}Waiting for Kafka to initialize...${NC}"
sleep 10

# Wait for Kafka to be truly ready
echo -e "${YELLOW}Checking Kafka health...${NC}"
for i in {1..30}; do
	if docker exec $(docker ps -qf "name=kafka") kafka-broker-api-versions --bootstrap-server localhost:9092 >/dev/null 2>&1; then
		echo -e "${GREEN}Kafka is ready!${NC}"
		break
	fi
	if [ $i -eq 30 ]; then
		echo -e "${RED}Kafka failed to start properly. Check docker logs.${NC}"
		exit 1
	fi
	echo -e "Waiting for Kafka... ($i/30)"
	sleep 2
done

# Create required Kafka topics
echo -e "${YELLOW}Creating Kafka topics...${NC}"
KAFKA_CONTAINER=$(docker ps -qf "name=kafka")
for topic in zone.state.change disruption.event claim.trigger payout.request; do
	docker exec "$KAFKA_CONTAINER" kafka-topics --create \
		--bootstrap-server localhost:9092 \
		--topic "$topic" \
		--partitions 3 \
		--replication-factor 1 \
		--if-not-exists 2>/dev/null || true
done
echo -e "${GREEN}Kafka topics ready!${NC}"

# 4. Create + activate Python virtual environment (once)
echo -e "${YELLOW}Preparing Python virtual environment...${NC}"
if [ ! -f "$PROJECT_DIR/ml-calcultion/.venv/bin/activate" ]; then
	echo -e "${BLUE}Creating .venv under ml-calcultion${NC}"
	python3 -m venv "$PROJECT_DIR/ml-calcultion/.venv"
fi

"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install --upgrade pip

# 5. Install Python dependencies for each ML service
echo -e "${YELLOW}Installing Python dependencies...${NC}"
"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install -r "$PROJECT_DIR/ml-calcultion/ml-insurance-service/requirements.txt"
"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install -r "$PROJECT_DIR/ml-calcultion/fraud-feature-service/requirements.txt"
"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install -r "$PROJECT_DIR/ml-calcultion/h3-feature-service/requirements.txt"
"$PROJECT_DIR/ml-calcultion/.venv/bin/pip" install -r "$PROJECT_DIR/ml-calcultion/grid_event_service/requirements.txt"

open_terminal() {
	local cmd="$1"
	cmd="${cmd//\"/\\\"}"
	/usr/bin/osascript -e "tell application \"Terminal\" to do script \"$cmd\""
}

# 6. Start ML Services in separate Terminal tabs
echo -e "${YELLOW}Starting ML services...${NC}"
open_terminal "cd \"$PROJECT_DIR/ml-calcultion\"; source .venv/bin/activate; export REDIS_URL=redis://127.0.0.1:6379/0; cd ml-insurance-service; echo ML-INSURANCE-8000; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
open_terminal "cd \"$PROJECT_DIR/ml-calcultion\"; source .venv/bin/activate; cd fraud-feature-service; export REDIS_URL=redis://127.0.0.1:6379/0; export USE_REDIS=True; echo FRAUD-EXTRACTOR-8002; uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
open_terminal "cd \"$PROJECT_DIR/ml-calcultion\"; source .venv/bin/activate; cd h3-feature-service; export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092; export REDIS_URL=redis://127.0.0.1:6379/0; export ML_INSURANCE_SERVICE_URL=http://127.0.0.1:8000; export STRICT_REALTIME=true; echo H3-FEATURE-8004; uvicorn main:app --host 0.0.0.0 --port 8004 --reload"
open_terminal "cd \"$PROJECT_DIR/ml-calcultion\"; source .venv/bin/activate; cd grid_event_service; export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092; export REDIS_URL=redis://127.0.0.1:6379/0; export ML_SERVICE_URL=http://127.0.0.1:8000; export H3_FEATURE_SERVICE_URL=http://127.0.0.1:8004; export USE_REDIS=True; echo GRID-EVENT-8003; uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

# 7. Setup Backend Database
echo -e "${YELLOW}Setting up Backend & Database...${NC}"
cd "$PROJECT_DIR/backend"

if [ ! -d "node_modules" ]; then
	echo -e "Installing backend dependencies..."
	npm install
fi

echo -e "Synchronizing Prisma Database Schema..."
npx prisma db push --accept-data-loss
npx prisma generate
echo -e "${GREEN}Database is ready!${NC}\n"

# 8. Start both servers together
echo -e "${YELLOW}Starting Backend & Frontend Servers...${NC}"

cleanup() {
	echo -e "\n${RED}Shutting down both servers... Goodbye!${NC}"
	if [ -n "${BACKEND_PID:-}" ] && [ "${BACKEND_STARTED_BY_SCRIPT:-0}" -eq 1 ]; then
		kill "$BACKEND_PID" 2>/dev/null || true
	fi
	exit
}

trap cleanup INT

BACKEND_STARTED_BY_SCRIPT=0
BACKEND_PID=""

EXISTING_BACKEND_PIDS=$(lsof -tiTCP:3001 -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$EXISTING_BACKEND_PIDS" ]; then
	echo -e "${YELLOW}Port 3001 is already in use by PID(s): $EXISTING_BACKEND_PIDS${NC}"
	echo -e "${YELLOW}Reusing existing backend process. Skipping new backend start.${NC}"
else
	echo -e "Starting NestJS Backend Server (Background)..."
	npm run start:dev &
	BACKEND_PID=$!
	BACKEND_STARTED_BY_SCRIPT=1
fi

sleep 3

cd "$PROJECT_DIR/frontend/mobile"
if [ ! -d "node_modules" ]; then
	echo -e "Installing frontend dependencies..."
	npm install
fi

echo -e "Starting Expo Go Server... (Scan the QR Code below!)"
echo -e "${BLUE}=======================================${NC}"
npx expo start --offline -c
