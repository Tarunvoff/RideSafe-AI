#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
LOG_DIR="$PROJECT_ROOT/.logs"
TMUX_SESSION_NAME="${TMUX_SESSION_NAME:-aegis}"

SERVICES=(
  "ml-insurance-service"
  "fraud-feature-service"
  "grid_event_service"
  "h3-feature-service"
  "backend"
  "mobile"
)

echo "Stopping Aegis services..."

for name in "${SERVICES[@]}"; do
  pid_file="$LOG_DIR/$name.pid"
  if [ -f "$pid_file" ]; then
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "- stopping $name (PID $pid)"
      kill "$pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pid_file"
  fi
done

if command -v tmux >/dev/null 2>&1; then
  if tmux has-session -t "$TMUX_SESSION_NAME" 2>/dev/null; then
    echo "- stopping tmux session $TMUX_SESSION_NAME"
    tmux kill-session -t "$TMUX_SESSION_NAME" || true
  fi
fi

echo "Done."
