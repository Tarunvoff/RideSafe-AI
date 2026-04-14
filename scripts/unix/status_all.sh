#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
LOG_DIR="$PROJECT_ROOT/.logs"

SERVICES=(
  "ml-insurance-service:8000"
  "fraud-feature-service:8002"
  "grid_event_service:8003"
  "h3-feature-service:8004"
  "backend:3001"
  "mobile:8081"
)

echo "==============================================="
echo "Aegis Service Status"
echo "==============================================="

for item in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$item"
  pid_file="$LOG_DIR/$name.pid"

  pid_status="not tracked"
  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      pid_status="running (PID $pid)"
    else
      pid_status="stale pid file"
    fi
  fi

  port_status="down"
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn 2>/dev/null | awk -v p=":$port" '$4 ~ p {found=1} END {exit found ? 0 : 1}'; then
      port_status="listening"
    fi
  elif command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      port_status="listening"
    fi
  fi

  echo "- $name: $pid_status | port $port: $port_status"
done

echo ""
echo "Logs folder: $LOG_DIR"
