# #!/bin/bash
# set -e

# # Aegis Unified Start Script (Unix)
# # Consolidated for Linux and macOS

# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# hash_file() {
#     local file_path="$1"
#     if command -v sha256sum >/dev/null 2>&1; then
#         sha256sum "$file_path" | awk '{print $1}'
#     elif command -v shasum >/dev/null 2>&1; then
#         shasum -a 256 "$file_path" | awk '{print $1}'
#     else
#         cksum "$file_path" | awk '{print $1}'
#     fi
# }

# normalize_h3_requirement() {
#     local requirements_file="$1"
#     if grep -Eq '^h3==[0-9]+\.[0-9]+\.[0-9]+$' "$requirements_file"; then
#         sed -i.bak -E 's/^h3==[0-9]+\.[0-9]+\.[0-9]+$/h3>=4.1.0/' "$requirements_file"
#         rm -f "${requirements_file}.bak"
#         echo "   - Normalized h3 constraint in $(basename "$(dirname "$requirements_file")")/requirements.txt to h3>=4.1.0"
#     fi
# }

# kill_port_processes() {
#     local port="$1"
#     local pids=""
#     local remaining=""

#     if command -v lsof >/dev/null 2>&1; then
#         pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
#     elif command -v ss >/dev/null 2>&1; then
#         pids="$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
#     fi

#     if [ -n "$pids" ]; then
#         echo "   - Releasing port $port (PID(s): $pids)"
#         kill $pids 2>/dev/null || true

#         if command -v lsof >/dev/null 2>&1; then
#             remaining="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
#         elif command -v ss >/dev/null 2>&1; then
#             remaining="$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
#         fi

#         if [ -n "$remaining" ]; then
#             echo "   - Force killing remaining PID(s) on port $port: $remaining"
#             kill -9 $remaining 2>/dev/null || true
#         fi
#     elif command -v fuser >/dev/null 2>&1; then
#         # Fallback when lsof/ss cannot resolve owner process details.
#         fuser -k "${port}/tcp" >/dev/null 2>&1 || true
#         fuser -k -9 "${port}/tcp" >/dev/null 2>&1 || true
#     fi
# }

# is_port_listening() {
#     local port="$1"
#     if command -v lsof >/dev/null 2>&1; then
#         lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
#         return $?
#     fi

#     if command -v ss >/dev/null 2>&1; then
#         ss -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p {found=1} END {exit found ? 0 : 1}'
#         return $?
#     fi

#     return 1
# }

# wait_for_port_release() {
#     local port="$1"
#     local attempts=0
#     local max_attempts=20

#     while is_port_listening "$port"; do
#         attempts=$((attempts + 1))
#         if [ "$attempts" -ge "$max_attempts" ]; then
#             echo "❌ Port $port is still in use after cleanup attempts"
#             return 1
#         fi
#         sleep 0.25
#     done

#     return 0
# }

# wait_for_tcp_port() {
#     local host="$1"
#     local port="$2"
#     local name="$3"
#     local attempts=0
#     local max_attempts=60

#     while true; do
#         if command -v nc >/dev/null 2>&1; then
#             if nc -z "$host" "$port" >/dev/null 2>&1; then
#                 return 0
#             fi
#         else
#             if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
#                 return 0
#             fi
#         fi

#         attempts=$((attempts + 1))
#         if [ "$attempts" -ge "$max_attempts" ]; then
#             echo "❌ Timed out waiting for $name at $host:$port"
#             return 1
#         fi
#         sleep 1
#     done
# }

# wait_for_kafka_topic_leaders() {
#     local host="$1"
#     local port="$2"
#     shift 2
#     local topics=("$@")
#     local attempts=0
#     local max_attempts=60
#     local topic=""
#     local describe_output=""

#     if ! docker ps --format '{{.Names}}' | grep -q '^aegis-kafka-1$'; then
#         echo "⚠️ Kafka container aegis-kafka-1 not found; skipping topic leader readiness check"
#         return 0
#     fi

#     while true; do
#         local all_ready="true"
#         for topic in "${topics[@]}"; do
#             describe_output="$(docker exec aegis-kafka-1 bash -lc "/opt/kafka/bin/kafka-topics.sh --bootstrap-server ${host}:${port} --describe --topic ${topic}" 2>/dev/null || true)"

#             if [ -z "$describe_output" ] || echo "$describe_output" | grep -Eq 'does not exist|Leader:[[:space:]]*-1|Leader:[[:space:]]*none'; then
#                 all_ready="false"
#                 break
#             fi
#         done

#         if [ "$all_ready" = "true" ]; then
#             echo "✅ Kafka topic leaders ready: ${topics[*]}"
#             return 0
#         fi

#         attempts=$((attempts + 1))
#         if [ "$attempts" -ge "$max_attempts" ]; then
#             echo "⚠️ Timed out waiting for Kafka topic leaders; continuing with fallback-capable startup"
#             return 0
#         fi
#         sleep 1
#     done
# }

# ensure_kafka_topics_exist() {
#     local host="$1"
#     local port="$2"
#     shift 2
#     local topics=("$@")
#     local existing=""
#     local topic=""

#     if ! docker ps --format '{{.Names}}' | grep -q '^aegis-kafka-1$'; then
#         echo "⚠️ Kafka container aegis-kafka-1 not found; skipping topic creation"
#         return 0
#     fi

#     existing="$(docker exec aegis-kafka-1 bash -lc "/opt/kafka/bin/kafka-topics.sh --bootstrap-server ${host}:${port} --list" 2>/dev/null || true)"

#     for topic in "${topics[@]}"; do
#         if ! echo "$existing" | grep -qx "$topic"; then
#             echo "   - Creating missing Kafka topic: $topic"
#             docker exec aegis-kafka-1 bash -lc "/opt/kafka/bin/kafka-topics.sh --bootstrap-server ${host}:${port} --create --if-not-exists --topic ${topic} --partitions 1 --replication-factor 1" >/dev/null 2>&1 || true
#         fi
#     done
# }

# start_in_tmux_window() {
#     local session_name="$1"
#     local window_name="$2"
#     local work_dir="$3"
#     local command="$4"

#     tmux new-window -t "$session_name" -n "$window_name" "cd \"$work_dir\" && . \"$RUNTIME_ENV_FILE\" && $command"
# }

# write_pid_file() {
#     local name="$1"
#     local pid="$2"
#     mkdir -p "$LOG_DIR"
#     echo "$pid" > "$LOG_DIR/$name.pid"
# }

# start_detached_process() {
#     local name="$1"
#     local work_dir="$2"
#     local command="$3"
#     local log_file="$LOG_DIR/$name.log"

#     mkdir -p "$LOG_DIR"
#     nohup bash -lc "cd \"$work_dir\" && . \"$RUNTIME_ENV_FILE\" && $command" > "$log_file" 2>&1 &
#     write_pid_file "$name" "$!"
#     echo "   - $name started (PID $!, logs: $log_file)"
# }

# write_runtime_env_file() {
#     mkdir -p "$(dirname "$RUNTIME_ENV_FILE")"
#     cat > "$RUNTIME_ENV_FILE" <<EOF
# export DATABASE_URL="$DATABASE_URL"
# export REDIS_URL="$REDIS_URL"
# export KAFKA_BOOTSTRAP_SERVERS="$KAFKA_BOOTSTRAP_SERVERS"
# export KAFKA_BROKER_URL="$KAFKA_BROKER_URL"
# export ML_SERVICE_URL="$ML_SERVICE_URL"
# export ML_INSURANCE_SERVICE_URL="$ML_INSURANCE_SERVICE_URL"
# export FRAUD_FEATURE_SERVICE_URL="$FRAUD_FEATURE_SERVICE_URL"
# export GRID_EVENT_SERVICE_URL="$GRID_EVENT_SERVICE_URL"
# export H3_FEATURE_SERVICE_URL="$H3_FEATURE_SERVICE_URL"
# export PLATFORM_API_URL="$PLATFORM_API_URL"
# EOF
# }

# clear_configured_ports() {
#     local ports_to_clear=()
#     local service_info=""
#     local service_name=""
#     local service_port=""

#     # Core app ports
#     ports_to_clear+=("$BACKEND_PORT" "$EXPO_PORT")

#     # ML service ports from configured service map
#     for service_info in "${SERVICES[@]}"; do
#         IFS=':' read -r service_name service_port <<< "$service_info"
#         ports_to_clear+=("$service_port")
#     done

#     # Optional extra ports provided by operator, comma-separated (e.g. EXTRA_KILL_PORTS=9000,9090)
#     if [ -n "$EXTRA_KILL_PORTS" ]; then
#         IFS=',' read -r -a extra_ports <<< "$EXTRA_KILL_PORTS"
#         ports_to_clear+=("${extra_ports[@]}")
#     fi

#     # De-duplicate and clear listeners
#     for port in $(printf '%s\n' "${ports_to_clear[@]}" | awk 'NF' | sort -u); do
#         kill_port_processes "$port"
#         wait_for_port_release "$port"
#     done
# }

# ensure_python_deps() {
#     local service_dir="$1"
#     local requirements_file="$service_dir/requirements.txt"
#     local venv_dir="$service_dir/.venv"
#     local marker_file="$venv_dir/.requirements.sha256"
#     local current_hash=""
#     local cached_hash=""

#     normalize_h3_requirement "$requirements_file"

#     if [ ! -f "$venv_dir/bin/activate" ]; then
#         python3 -m venv "$venv_dir"
#     fi

#     current_hash="$(hash_file "$requirements_file")"
#     if [ -f "$marker_file" ]; then
#         cached_hash="$(cat "$marker_file")"
#     fi

#     if [ "$current_hash" != "$cached_hash" ]; then
#         echo "   - Installing Python deps for $(basename "$service_dir")"
#         "$venv_dir/bin/pip" install --upgrade pip
#         "$venv_dir/bin/pip" install -r "$requirements_file"
#         echo "$current_hash" > "$marker_file"
#     else
#         echo "   - Python deps unchanged for $(basename "$service_dir"), skipping install"
#     fi
# }

# ensure_node_deps() {
#     local service_dir="$1"
#     local package_json="$service_dir/package.json"
#     local lock_file="$service_dir/package-lock.json"
#     local node_modules_dir="$service_dir/node_modules"
#     local marker_file="$node_modules_dir/.deps.sha256"
#     local current_hash=""
#     local cached_hash=""

#     current_hash="$(hash_file "$package_json")"
#     if [ -f "$lock_file" ]; then
#         current_hash+="-$(hash_file "$lock_file")"
#     fi

#     if [ -f "$marker_file" ]; then
#         cached_hash="$(cat "$marker_file")"
#     fi

#     if [ ! -d "$node_modules_dir" ] || [ "$current_hash" != "$cached_hash" ]; then
#         echo "   - Installing Node deps for $(basename "$service_dir")"
#         cd "$service_dir"
#         if [ -f "$lock_file" ]; then
#             if ! npm ci; then
#                 echo "   - npm ci failed for $(basename "$service_dir"); falling back to npm install"
#                 npm install
#             fi
#         else
#             npm install
#         fi
#         current_hash="$(hash_file "$package_json")"
#         if [ -f "$lock_file" ]; then
#             current_hash+="-$(hash_file "$lock_file")"
#         fi
#         mkdir -p "$node_modules_dir"
#         echo "$current_hash" > "$marker_file"
#     else
#         echo "   - Node deps unchanged for $(basename "$service_dir"), skipping install"
#     fi
# }

# echo "========================================================"
# echo "🚀 STARTING AEGIS DISTRIBUTED ENGINE (UNIX)"
# echo "========================================================"

# cd "$PROJECT_ROOT"

# BACKEND_PORT="3001"
# EXPO_PORT="8081"
# SERVICES=("ml-insurance-service:8000" "fraud-feature-service:8002" "grid-event-service:8003" "h3-feature-service:8004")
# EXTRA_KILL_PORTS="${EXTRA_KILL_PORTS:-}"
# LAUNCH_MODE="${LAUNCH_MODE:-easy}"
# TMUX_SESSION_NAME="${TMUX_SESSION_NAME:-aegis}"
# SKIP_TMUX_ATTACH="${SKIP_TMUX_ATTACH:-0}"
# API_URL_OVERRIDE="${API_URL_OVERRIDE:-}"
# PUBLIC_API_HOST="${PUBLIC_API_HOST:-}"
# PLATFORM_API_URL_OVERRIDE="${PLATFORM_API_URL_OVERRIDE:-}"
# EXPO_START_CMD="${EXPO_START_CMD:-npx expo start --clear}"
# RUNTIME_ENV_FILE="$PROJECT_ROOT/.tmp/start.runtime.env"
# LOG_DIR="$PROJECT_ROOT/.logs"

# DB_HOST="${DB_HOST:-localhost}"
# DB_PORT="${DB_PORT:-5433}"
# KAFKA_HOST="${KAFKA_HOST:-localhost}"
# KAFKA_PORT="${KAFKA_PORT:-9092}"
# REDIS_HOST="${REDIS_HOST:-localhost}"
# REDIS_PORT="${REDIS_PORT:-6379}"

# # 1. Start Docker
# echo "[1/8] Starting Docker containers..."
# docker compose up -d --remove-orphans

# # 2. IP Detection and Frontend Env Sync
# echo "[2/8] Syncing mobile app configuration..."

# # Cross-platform IP Detection
# if [[ "$OSTYPE" == "darwin"* ]]; then
#     # macOS
#     LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
# else
#     # Linux (handling multiple possible tools)
#     LOCAL_IP=$(hostname -I | awk '{print $1}' || ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -n 1 || echo "127.0.0.1")
# fi

# FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/mobile/.env"

# if [ -n "$PUBLIC_API_HOST" ]; then
#     BACKEND_PUBLIC_BASE_URL="http://${PUBLIC_API_HOST}:${BACKEND_PORT}/api"
# else
#     BACKEND_PUBLIC_BASE_URL="http://${LOCAL_IP}:${BACKEND_PORT}/api"
# fi

# if [ -n "$API_URL_OVERRIDE" ]; then
#     BACKEND_PUBLIC_BASE_URL="$API_URL_OVERRIDE"
# fi

# if [ -f "$FRONTEND_ENV_FILE" ]; then
#     # Portable sed removal (deletes existing line)
#     sed -i.bak '/EXPO_PUBLIC_API_URL/d' "$FRONTEND_ENV_FILE" && rm -f "${FRONTEND_ENV_FILE}.bak"
# else
#     touch "$FRONTEND_ENV_FILE"
# fi

# echo "EXPO_PUBLIC_API_URL=$BACKEND_PUBLIC_BASE_URL" >> "$FRONTEND_ENV_FILE"
# echo "✅ Backend configured at $BACKEND_PUBLIC_BASE_URL"

# # Host-run services must use host-exposed ports, not Docker DNS container names.
# export DATABASE_URL="postgresql://postgres:12345678@${DB_HOST}:${DB_PORT}/RideSafe_AI"
# export REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}/0"
# export KAFKA_BOOTSTRAP_SERVERS="${KAFKA_HOST}:${KAFKA_PORT}"
# export KAFKA_BROKER_URL="$KAFKA_BOOTSTRAP_SERVERS"
# export ML_SERVICE_URL="http://127.0.0.1:8000"
# export ML_INSURANCE_SERVICE_URL="http://127.0.0.1:8000"
# export FRAUD_FEATURE_SERVICE_URL="http://127.0.0.1:8002"
# export GRID_EVENT_SERVICE_URL="http://127.0.0.1:8003"
# export H3_FEATURE_SERVICE_URL="http://127.0.0.1:8004"
# if [ -n "$PLATFORM_API_URL_OVERRIDE" ]; then
#     export PLATFORM_API_URL="$PLATFORM_API_URL_OVERRIDE"
# elif [ -n "$PUBLIC_API_HOST" ]; then
#     export PLATFORM_API_URL="http://${PUBLIC_API_HOST}:${BACKEND_PORT}/api/platform/activity"
# else
#     export PLATFORM_API_URL="http://${LOCAL_IP}:${BACKEND_PORT}/api/platform/activity"
# fi
# write_runtime_env_file
# export NODE_OPTIONS='--no-deprecation'
# export KAFKAJS_NO_PARTITIONER_WARNING=1

# # 3. Runtime prerequisite checks
# echo "[3/8] Verifying runtime prerequisites..."
# if ! command -v python3 >/dev/null 2>&1; then
#     echo "❌ python3 is required but was not found in PATH"
#     exit 1
# fi

# echo "[3.1/8] Waiting for Docker dependencies..."
# wait_for_tcp_port "$DB_HOST" "$DB_PORT" "TimescaleDB"
# wait_for_tcp_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
# wait_for_tcp_port "$KAFKA_HOST" "$KAFKA_PORT" "Kafka"
# ensure_kafka_topics_exist "$KAFKA_HOST" "$KAFKA_PORT" "driver_telemetry" "zone_state_updates"
# wait_for_kafka_topic_leaders "$KAFKA_HOST" "$KAFKA_PORT" "driver_telemetry" "zone_state_updates"

# # 4. Clean up conflicting ports from previous runs
# echo "[4/8] Releasing conflicting ports..."
# clear_configured_ports

# if [ "$LAUNCH_MODE" = "tmux" ]; then
#     if ! command -v tmux >/dev/null 2>&1; then
#         echo "❌ tmux is required for LAUNCH_MODE=tmux. Install tmux or run with LAUNCH_MODE=easy"
#         exit 1
#     fi

#     if tmux has-session -t "$TMUX_SESSION_NAME" 2>/dev/null; then
#         tmux kill-session -t "$TMUX_SESSION_NAME"
#     fi
#     tmux new-session -d -s "$TMUX_SESSION_NAME" -n "orchestrator"
# fi

# # 5. Start ML Services (in background or new terminals)
# echo "[5/8] Starting ML services..."
# # Logic to detect terminal emulator (gnome-terminal, iterm, etc.) would go here
# # For brevity, using background processes if no terminal is found

# for SERVICE_INFO in "${SERVICES[@]}"; do
#     IFS=':' read -r SERVICE PORT <<< "$SERVICE_INFO"
#     echo "   - Launching $SERVICE on port $PORT"
#     SERVICE_DIR="$PROJECT_ROOT/ml-services/$SERVICE"
#     ensure_python_deps "$SERVICE_DIR"
#     if [ "$LAUNCH_MODE" = "tmux" ]; then
#         start_in_tmux_window "$TMUX_SESSION_NAME" "$SERVICE" "$SERVICE_DIR" "$SERVICE_DIR/.venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT --reload"
#         echo "   - $SERVICE started in tmux window '$SERVICE'"
#     elif [ "$LAUNCH_MODE" = "inline" ]; then
#         cd "$SERVICE_DIR"
#         "$SERVICE_DIR/.venv/bin/uvicorn" main:app --host 0.0.0.0 --port "$PORT" --reload &
#     else
#         start_detached_process "$SERVICE" "$SERVICE_DIR" "$SERVICE_DIR/.venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT --reload"
#     fi
# done

# # 6. Start Backend
# echo "[6/8] Starting NestJS Backend..."
# cd "$PROJECT_ROOT/backend"
# ensure_node_deps "$PROJECT_ROOT/backend"
# if [ "$LAUNCH_MODE" = "tmux" ]; then
#     start_in_tmux_window "$TMUX_SESSION_NAME" "backend" "$PROJECT_ROOT/backend" "npm run start:dev"
#     echo "   - backend started in tmux window 'backend'"
# elif [ "$LAUNCH_MODE" = "inline" ]; then
#     npm run start:dev &
# else
#     start_detached_process "backend" "$PROJECT_ROOT/backend" "npm run start:dev"
# fi

# # 7. Start Mobile App
# echo "[7/8] Starting Expo Mobile Application..."
# cd "$PROJECT_ROOT/frontend/mobile"
# ensure_node_deps "$PROJECT_ROOT/frontend/mobile"
# if [ "$LAUNCH_MODE" = "tmux" ]; then
#     start_in_tmux_window "$TMUX_SESSION_NAME" "mobile" "$PROJECT_ROOT/frontend/mobile" "$EXPO_START_CMD"
#     echo "   - mobile started in tmux window 'mobile'"
# elif [ "$LAUNCH_MODE" = "inline" ]; then
#     bash -lc "$EXPO_START_CMD" &
# else
#     start_detached_process "mobile" "$PROJECT_ROOT/frontend/mobile" "$EXPO_START_CMD"
# fi

# echo ""
# echo "========================================================"
# echo "✅ ALL SERVICES RUNNING 🚀"
# echo "========================================================"

# if [ "$LAUNCH_MODE" = "tmux" ]; then
#     echo "tmux session: $TMUX_SESSION_NAME"
#     echo "Attach: tmux attach -t $TMUX_SESSION_NAME"
#     echo "Switch windows: Ctrl+b then n/p"
#     if [ "$SKIP_TMUX_ATTACH" = "0" ] && [ -t 1 ] && [ -z "$TMUX" ]; then
#         tmux attach -t "$TMUX_SESSION_NAME"
#     fi
# elif [ "$LAUNCH_MODE" = "inline" ]; then
#     wait
# else
#     echo "Mode: easy (detached)"
#     echo "Status: bash scripts/unix/status_all.sh"
#     echo "Stop:   bash scripts/unix/stop_all.sh"
#     echo "Logs:   tail -f .logs/<service>.log"
# fi


#!/bin/bash
set -e

echo "========================================================"
echo "🚀 STARTING AEGIS DISTRIBUTED ENGINE (SMART + GUI)"
echo "========================================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../" && pwd)"

BACKEND_PORT=3001
EXPO_PORT=8081

SERVICES=(
  "ml-insurance-service:8000"
  "fraud-feature-service:8002"
  "grid-event-service:8003"
  "h3-feature-service:8004"
)

DB_HOST="localhost"
DB_PORT="5433"
REDIS_HOST="localhost"
REDIS_PORT="6379"
KAFKA_HOST="localhost"
KAFKA_PORT="9092"

# -----------------------------
# FUNCTION: WAIT FOR PORT
# -----------------------------
wait_for_tcp_port() {
  local host=$1
  local port=$2
  local name=$3

  echo "⏳ Waiting for $name at $host:$port..."

  while ! nc -z "$host" "$port" 2>/dev/null; do
    sleep 1
  done

  echo "✅ $name is ready"
}

kill_port_processes() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
  fi

  if [ -n "$pids" ]; then
    echo "   - Releasing port $port (PID(s): $pids)"
    kill $pids 2>/dev/null || true
    sleep 0.3
    kill -9 $pids 2>/dev/null || true
  fi
}

clear_configured_ports() {
  local ports_to_clear=("$BACKEND_PORT" "$EXPO_PORT")
  local service_info=""
  local service_name=""
  local service_port=""

  for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name service_port <<< "$service_info"
    ports_to_clear+=("$service_port")
  done

  for port in $(printf '%s\n' "${ports_to_clear[@]}" | awk 'NF' | sort -u); do
    kill_port_processes "$port"
  done
}

# -----------------------------
# CHECK DOCKER
# -----------------------------
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker not running"
  exit 1
fi

# -----------------------------
# START DOCKER
# -----------------------------
echo "[1/7] Starting Docker containers..."
cd "$PROJECT_ROOT"
docker compose up -d --force-recreate

# -----------------------------
# WAIT FOR CORE SERVICES
# -----------------------------
echo "[2/7] Waiting for dependencies..."

wait_for_tcp_port "$DB_HOST" "$DB_PORT" "TimescaleDB"
wait_for_tcp_port "$REDIS_HOST" "$REDIS_PORT" "Redis"
wait_for_tcp_port "$KAFKA_HOST" "$KAFKA_PORT" "Kafka"

# -----------------------------
# KAFKA READINESS (SCRIPT 2 STYLE)
# -----------------------------
echo "⏳ Checking Kafka readiness..."

until docker exec aegis-kafka-1 bash -c \
  "kafka-topics.sh --bootstrap-server localhost:9092 --list" > /dev/null 2>&1; do
  echo "Kafka not ready yet..."
  sleep 2
done

echo "✅ Kafka is READY"

# -----------------------------
# RELEASE PREVIOUS LISTENERS
# -----------------------------
echo "[2.5/7] Releasing conflicting ports..."
clear_configured_ports

# -----------------------------
# DETECT IP
# -----------------------------
echo "[3/7] Detecting IP..."

LOCAL_IP=$(ip -o -4 addr show up scope global \
  | awk '$2 !~ /^(docker0|br-|veth|lo)$/ {print $4}' \
  | cut -d/ -f1 \
  | head -n 1)

[ -z "$LOCAL_IP" ] && LOCAL_IP=$(hostname -I | awk '{print $1}')
[ -z "$LOCAL_IP" ] && LOCAL_IP="127.0.0.1"

echo "✅ IP: $LOCAL_IP"

# -----------------------------
# UPDATE FRONTEND ENV
# -----------------------------
echo "[4/7] Updating frontend .env..."

ENV_FILE="$PROJECT_ROOT/frontend/mobile/.env"
sed -i '/EXPO_PUBLIC_API_URL/d' "$ENV_FILE" 2>/dev/null || true
echo "EXPO_PUBLIC_API_URL=http://$LOCAL_IP:$BACKEND_PORT/api" >> "$ENV_FILE"

# -----------------------------
# START ML SERVICES (GUI)
# -----------------------------
echo "[5/7] Starting ML services..."

for SERVICE_INFO in "${SERVICES[@]}"; do
  IFS=':' read -r SERVICE PORT <<< "$SERVICE_INFO"

  SERVICE_DIR="$PROJECT_ROOT/ml-services/$SERVICE"

  gnome-terminal -- bash -c "
  cd '$SERVICE_DIR' &&
  python3 -m venv .venv &&
  source .venv/bin/activate &&
  pip install -r requirements.txt &&
  uvicorn main:app --host 0.0.0.0 --port $PORT --reload;
  exec bash"
done

# -----------------------------
# START BACKEND (GUI)
# -----------------------------
echo "[6/7] Starting backend..."

gnome-terminal -- bash -c "
cd '$PROJECT_ROOT/backend' &&
npm install &&
npm run start:dev;
exec bash"

# -----------------------------
# START FRONTEND (GUI)
# -----------------------------
echo "[7/7] Starting mobile app..."

gnome-terminal -- bash -c "
cd '$PROJECT_ROOT/frontend/mobile' &&
npm install &&
npx expo start --clear;
exec bash"

echo ""
echo "========================================================"
echo "✅ ALL SERVICES RUNNING (SMART + GUI) 🚀"
echo "========================================================"