# Run All Services Separately (SSH-Friendly)

Use one terminal per service.

## If you see: Address already in use

This means that port is already occupied by an existing process (often from a previous run).

Check current service status:
```bash
cd /home/ubuntu/ridesafe-ai
bash scripts/unix/status_all.sh
```

Stop all tracked services cleanly:
```bash
cd /home/ubuntu/ridesafe-ai
bash scripts/unix/stop_all.sh
```

Or free only one port (example: 8002):
```bash
ss -ltnp | grep ':8002' || true
fuser -k 8002/tcp || true
```

Then start that service again.

## Terminal 1: Infra (Docker)
```bash
cd /home/ubuntu/ridesafe-ai
docker compose up -d zookeeper kafka redis timescaledb
```

## Terminal 2: ML Insurance Service (8000)
```bash
cd /home/ubuntu/ridesafe-ai/ml-calcultion/ml-insurance-service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Terminal 3: Fraud Feature Service (8002)
```bash
cd /home/ubuntu/ridesafe-ai/ml-calcultion/fraud-feature-service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## Terminal 4: Grid Event Service (8003)
```bash
cd /home/ubuntu/ridesafe-ai/ml-calcultion/grid_event_service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
export USE_REDIS=true
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export REDIS_URL=redis://localhost:6379/0
uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

## Terminal 5: H3 Feature Service (8004)
```bash
cd /home/ubuntu/ridesafe-ai/ml-calcultion/h3-feature-service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
export REDIS_URL=redis://localhost:6379/0
export ML_INSURANCE_SERVICE_URL=http://127.0.0.1:8000
export PLATFORM_API_URL=http://127.0.0.1:3001/api/platform/activity
uvicorn main:app --host 0.0.0.0 --port 8004 --reload
```

## Terminal 6: Backend (NestJS, 3001)
```bash
cd /home/ubuntu/ridesafe-ai/backend
npm install
export DATABASE_URL=postgresql://postgres:12345678@localhost:5433/RideSafe_AI
export REDIS_URL=redis://localhost:6379/0
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export KAFKA_BROKER_URL=localhost:9092
export ML_SERVICE_URL=http://127.0.0.1:8000
export ML_INSURANCE_SERVICE_URL=http://127.0.0.1:8000
export FRAUD_FEATURE_SERVICE_URL=http://127.0.0.1:8002
export GRID_EVENT_SERVICE_URL=http://127.0.0.1:8003
export H3_FEATURE_SERVICE_URL=http://127.0.0.1:8004
npm run start:dev
```

## Terminal 7: Frontend Expo (Tunnel mode for SSH)
```bash
cd /home/ubuntu/ridesafe-ai/frontend/mobile
npm install
export EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api
npx expo start --tunnel --clear --port 8081
```

## Optional: Quick status checks
```bash
ss -ltnp | grep -E ':3001|:8000|:8002|:8003|:8004|:8081|:9092|:6379|:5433'
```

## Optional: Stop infra
```bash
cd /home/ubuntu/ridesafe-ai
docker compose down
```
