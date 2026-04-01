# Developer 3 — Python ML Services

## Quick Reference Card
- **Owns:** `ml-calcultion/` (all Python services, ML models)
- **Never touches:** `backend/` (NestJS APIs), `frontend/` (React Native)
- **Must complete before Dev 1 can start:** Mock API for risk score responses
- **Blocked until Dev 2 completes:** None (You can mock Kafka events initially)
- **Estimated complexity:** High

---

## Assigned Services / Modules
- `ml-calcultion/fraud-feature-service/`
- `ml-calcultion/grid_event_service/`
- `ml-calcultion/h3-feature-service/`
- `ml-calcultion/ml-insurance-service/`

---

## What Is Already Done in Their Scope
- Python virtual env structure, Dockerfiles, and `requirements.txt` sets are somewhat established.
- Boilerplate `main.py` files exist routing the Python service containers.
- Code itself is largely unimplemented ML calculation stubs.

---

## Shared Contract Spec (Read This Before Writing Any Code)

> This section is identical across all 4 developer documents. It is the single source of truth.
> You may not deviate from any contract defined here. If you need a change, it must be agreed upon
> and this spec must be updated before any code is written.

### A. API Response Envelope
Specify the standard response shape all backend endpoints must return:
```json
// Success
{ "success": true, "data": <payload>, "meta": <pagination> }
// Error
{ "success": false, "error": { "code": "STRING_CODE", "message": "string", "details": {} } }
```

### B. Authentication Contract
- Token format: JWT
- Header name and format: `Authorization: Bearer <token>`
- Where tokens are validated: Internally in ML Gateway endpoints via shared JWT Secret, or completely bypassed if Dev 1 Gateways are isolating traffic.

### C. Database Schema Contract
- Tables tracked via Prisma (`backend/prisma/schema.prisma`). Shared tables: `User`, `DriverTelemetry` (TimescaleDB).
- ML services read/write to TimescaleDB for telemetry outputs (`DATABASE_URL=...`).

### D. Environment Variable Registry
- `DATABASE_URL` (requires a valid Postgres/Timescale DB connection string)
- `JWT_SECRET` (string, required)
- `KAFKA_BROKERS` (string, required, e.g., kafka:9092)

### E. Inter-Service Event/Message Contract (Kafka)
- Topic `driver_telemetry`: `{ driverId: UUID, lat: Float, lon: Float, timestamp: ISO8601, speed: Float }`
- Topic `zone_state_updates`: `{ zoneId: String, status: "CLEAR" | "RISK", h3Index: String }`

### F. Error Code Registry
- `ERR_AUTH_INVALID_TOKEN`
- `ERR_DB_QUERY_FAILED`
- `ERR_KAFKA_UNREACHABLE`

---

## Tasks — Ordered by Dependency (Complete in This Exact Sequence)

### Task 1 — Hook up Kafka Consumers in Python
**Service/Module:** `ml-calcultion/h3-feature-service/`
**Depends on:** None (Mock it initially if Dev 2 is slow)
**Unblocks:** Base computation grid

**Files to create or edit:**
- `ml-calcultion/h3-feature-service/services/kafka_consumer.py`
- `ml-calcultion/h3-feature-service/main.py`

**What exactly to implement:**
Step 1: Write an `aiokafka` consumer listening to `driver_telemetry`.
Step 2: Parse incoming JSON, extract coordinates, map them to H3 cells.
Step 3: Keep simple running average of speed in simple Redis cache per cell.

### Task 2 — Implement REST Risk Endpoints
**Service/Module:** `ml-calcultion/fraud-feature-service/`
**Depends on:** Task 1
**Unblocks:** Dev 1 (KYC / Fraud API bridging)

**Files to create or edit:**
- `ml-calcultion/fraud-feature-service/routes/risk.py`

**What exactly to implement:**
Step 1: Map `/api/v1/risk/:userId` returning standard JSON API envelope `{ success, data...}`.
Step 2: Connect DB queries to evaluate risk per user telemetry history.

---

## Files This Developer Must NEVER Touch
- `backend/`
- `frontend/`

---

## Cross-Developer Dependencies
| Depends On | What You Need | When You Need It | Who Provides It |
|-----------|--------------|-----------------|----------------|
| Dev 2 | Kafka Producer fully deployed | Before Final Integration Tests | Dev 2 |

---

## Definition of Done
- [ ] No hardcoded DB connections — exclusively uses `DATABASE_URL`.
- [ ] All FastAPI endpoints return the JSON payload contract explicitly.
- [ ] Requirements.txt is clean and repeatable.
