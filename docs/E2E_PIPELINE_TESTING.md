# Aegis End-to-End Pipeline Testing Guide (Fresh Clone)

This guide is written so anyone can clone the repository and run a complete end-to-end test with minimal guesswork.

It covers:
- Local infrastructure (Postgres, Kafka, Redis)
- Backend API flow (auth, KYC, fraud)
- Kafka event production and consumption
- Redis zone-state updates
- ML pipeline flow (GPS -> H3 -> risk -> pricing)

## 1. Prerequisites

## 1.1 Required Tools

- Git
- Node.js 18+ and npm
- Python 3.10+ (3.11 recommended)
- Docker Desktop (with Docker Compose)
- curl
- jq (recommended for token extraction)

## 1.2 macOS Install (Homebrew)

If needed, install everything with:

```bash
brew install git node python jq
```

Then install and start Docker Desktop from:

```text
https://www.docker.com/products/docker-desktop/
```

Validate tooling:

```bash
node -v
npm -v
python3 --version
docker --version
docker compose version
jq --version
```

## 2. Clone and Install Dependencies

From your workspace root:

```bash
git clone <your-fork-or-origin-url> AEGIS
cd AEGIS

# Backend
cd backend && npm install && cd ..

# Mobile frontend (optional for API/ML pipeline tests)
cd frontend/mobile && npm install && cd ../..

# Python env for ML insurance service
cd ml-calcultion/ml-insurance-service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
deactivate
cd ../..

# Python env for H3 feature service
cd ml-calcultion/h3-feature-service
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
deactivate
cd ../..

# Python env for Kafka grid consumer
cd ml-calcultion/ml_microservice/ml
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
deactivate
cd ../../../
```

## 3. Environment Configuration

## 3.1 Backend Environment

Create backend env file:

```bash
cp backend/.env.example backend/.env
```

Edit backend/.env and make sure these values are set for local Docker DB/Kafka/Redis:

```env
DATABASE_URL="postgresql://postgres:12345@localhost:5432/gigshield"
REDIS_URL="redis://localhost:6379/0"
KAFKA_BROKER_URL="localhost:9092"

PORT=3001
JWT_SECRET="dev_jwt_secret"
JWT_REFRESH_SECRET="dev_refresh_secret"

APP_NAME="Aegis"

# Required for admin login flow
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin12345"

# Optional for this E2E path unless testing OTP email or payments
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

## 3.2 Mobile Environment (Optional)

```bash
cp frontend/mobile/.env.example frontend/mobile/.env
```

If backend is local:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

## 4. Start Local Infrastructure (Docker)

Run from repository root:

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml up -d
```

Check status:

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml ps
```

Expected running services:
- zookeeper
- kafka
- redis
- db (postgres)

## 5. Prepare Backend Database

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
```

## 6. Start All Runtime Services

Use separate terminals.

## Terminal A: Backend API (port 3001)

```bash
cd backend
npm run start:dev
```

## Terminal B: ML Insurance Service (port 8000)

```bash
cd ml-calcultion/ml-insurance-service
source .venv/bin/activate
python train_models.py
python main.py
```

## Terminal C: H3 Feature Service (port 8001)

```bash
cd ml-calcultion/h3-feature-service
source .venv/bin/activate
python main.py
```

## Terminal D: Kafka Grid Event Consumer

```bash
cd ml-calcultion/ml_microservice/ml
source .venv/bin/activate
export KAFKA_BROKER_URL=localhost:9092
export REDIS_URL=redis://localhost:6379/0
python grid_event_service.py
```

## 7. Health Checks (Quick)

Run from repo root in a new terminal:

```bash
curl -s http://localhost:3001/api/plans/weekly | jq
curl -s http://localhost:8000/health | jq
curl -s http://localhost:8001/health | jq
```

Expected:
- Backend returns weekly plans list
- ML service returns healthy
- H3 feature service returns healthy

## 8. Test ML Pipeline End-to-End (Automated)

This validates:
- /features endpoint
- /pipeline endpoint
- Service-to-service call from port 8001 -> 8000

```bash
cd ml-calcultion/h3-feature-service
source .venv/bin/activate
python test_pipeline.py
```

Expected final line includes:

```text
All tests passed
```

## 9. Test Backend -> Kafka -> Redis End-to-End

This is the full API-driven event path:
1. Register driver
2. Login and get JWT
3. Submit fraud analysis (publishes Kafka driver_telemetry)
4. Grid consumer processes event
5. Redis state updated
6. Kafka zone_state_updates gets emitted

## 9.1 Register and Login

```bash
EMAIL="driver.$(date +%s)@example.com"
PASSWORD="Password123"

curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq

LOGIN_JSON=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_JSON" | jq
ACCESS_TOKEN=$(echo "$LOGIN_JSON" | jq -r '.accessToken')
echo "Token length: ${#ACCESS_TOKEN}"
```

## 9.2 Submit Fraud Analysis (Publishes Kafka Event)

```bash
curl -s -X POST http://localhost:3001/api/fraud/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "gpsLatitude": 12.9352,
    "gpsLongitude": 77.6245,
    "deviceIntegrity": "Clean Device",
    "networkType": "Mobile Data",
    "velocityCheck": "Normal"
  }' | jq
```

## 9.3 Verify Kafka Topic: driver_telemetry

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml \
  exec -T kafka kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic driver_telemetry \
  --from-beginning --max-messages 2
```

Expected: message contains rider_id, lat, lng, timestamp.

## 9.4 Verify Redis Zone State Key

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml \
  exec -T redis redis-cli KEYS "zone:*:state"
```

Then inspect one key:

```bash
KEY=$(docker compose -f ml-calcultion/ml_microservice/docker-compose.yml \
  exec -T redis redis-cli --raw KEYS "zone:*:state" | head -n 1)

docker compose -f ml-calcultion/ml_microservice/docker-compose.yml \
  exec -T redis redis-cli GET "$KEY"
```

Expected JSON includes:
- zone_state
- lf_score
- last_updated
- active_rider_count

## 9.5 Verify Kafka Topic: zone_state_updates

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml \
  exec -T kafka kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic zone_state_updates \
  --from-beginning --max-messages 5
```

Expected: transition event with old_state and new_state.

## 10. Optional: KYC Flow API Test

Use the same ACCESS_TOKEN:

```bash
curl -s -X POST http://localhost:3001/api/kyc/basic-identity \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"fullName":"Test Driver","dob":"1998-01-15","gender":"Male"}' | jq

curl -s -X POST http://localhost:3001/api/kyc/personal-details \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"address":"12 MG Road","city":"Bengaluru","state":"Karnataka","pincode":"560001"}' | jq

curl -s -X POST http://localhost:3001/api/kyc/identity-verification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"aadhaarNumber":"123412341234","panNumber":"ABCDE1234F"}' | jq

curl -s -X POST http://localhost:3001/api/kyc/payout-setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"method":"UPI","upiId":"driver@upi"}' | jq

curl -s -X POST http://localhost:3001/api/kyc/submit \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

curl -s -X GET http://localhost:3001/api/kyc/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## 11. Full Success Criteria Checklist

Mark E2E as successful only if all are true:

- Docker services are healthy (Kafka, Redis, Postgres)
- Backend responds on port 3001 with seeded weekly plans
- ML service healthy on port 8000
- H3 feature service healthy on port 8001
- test_pipeline.py passes fully
- Fraud analyze API call succeeds with authenticated user
- driver_telemetry topic receives messages
- Redis has zone:*:state keys populated
- zone_state_updates topic receives state transition messages

## 12. Common Issues and Fixes

## Issue: Prisma cannot connect to DB

Fix:
- Ensure Docker Postgres is running
- Verify backend/.env DATABASE_URL matches local compose values

## Issue: Kafka connect error in backend or grid_event_service

Fix:
- Set KAFKA_BROKER_URL=localhost:9092 for local host processes
- Confirm kafka service is healthy via docker compose ps

## Issue: ML test says port 8000 unreachable

Fix:
- Start ml-insurance-service first
- Confirm http://localhost:8000/health returns healthy

## Issue: No zone_state_updates messages

Fix:
- Ensure grid_event_service.py is running
- Trigger fraud analyze again
- Re-check driver_telemetry topic for incoming messages

## 13. Cleanup

Stop app processes in each terminal using Ctrl+C.

Stop infra:

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml down
```

If you also want to remove Postgres data volume:

```bash
docker compose -f ml-calcultion/ml_microservice/docker-compose.yml down -v
```
