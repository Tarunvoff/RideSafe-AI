# Developer 2 — Telemetry & Event Streaming

## Quick Reference Card
- **Owns:** `backend/src/kafka`, `backend/src/telemetry`, `backend/src/ingestion`, `backend/src/fraud`
- **Never touches:** `backend/src/auth`, `backend/src/kyc`, `backend/src/payments`, `frontend/mobile/`, `ml-calcultion/`
- **Must complete before Dev 3 can start:** Kafka Provider Integration (Topic creation & formats)
- **Blocked until Dev 1 completes:** None (Independent Kafka setup)
- **Estimated complexity:** High

---

## Assigned Services / Modules
- `backend/src/ingestion/`
- `backend/src/kafka/`
- `backend/src/telemetry/`
- `backend/src/fraud/`

---

## What Is Already Done in Their Scope
- `backend/src/kafka/`: Boilerplate for `redis-fallback-queue`, `kafka-reliable-producer`, etc.
- Mostly stubs, Kafka Docker-compose definition exists, but connection logic needs writing.

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
- Where tokens are validated: `backend/src/auth/jwt-auth.guard.ts`
- Token refresh flow: `POST /auth/refresh` -> returns `{ token: string, refreshToken: string }`

### C. Database Schema Contract
- Tables tracked via Prisma (`backend/prisma/schema.prisma`). Shared tables: `User`, `DriverTelemetry` (TimescaleDB).
- No schema field renaming without global sync.

### D. Environment Variable Registry
- `DATABASE_URL` (requires a valid Postgres/Timescale DB connection string)
- `JWT_SECRET` (string, required)
- `KAFKA_BROKERS` (string, required, e.g., kafka:9092)
- `REDIS_URL` (url, required, e.g., redis://redis:6379)

### E. Inter-Service Event/Message Contract (Kafka)
- Topic `driver_telemetry`: `{ driverId: UUID, lat: Float, lon: Float, timestamp: ISO8601, speed: Float }`
- Topic `zone_state_updates`: `{ zoneId: String, status: "CLEAR" | "RISK", h3Index: String }`

### F. Error Code Registry
- `ERR_AUTH_INVALID_TOKEN`
- `ERR_USER_NOT_FOUND`
- `ERR_VALIDATION_FAILED`
- `ERR_DB_QUERY_FAILED`
- `ERR_KAFKA_UNREACHABLE`

---

## Tasks — Ordered by Dependency (Complete in This Exact Sequence)

### Task 1 — Setup Kafka Connection & Producers
**Service/Module:** `backend/src/kafka/`
**Depends on:** None
**Unblocks:** Dev 3 (Kafka consumers in ML)

**Files to create or edit:**
- `backend/src/kafka/kafka.producer.service.ts`
- `backend/src/kafka/redis-fallback-queue.service.ts`

**What exactly to implement:**
Step 1: Write robust Kafka producer connection logic taking `KAFKA_BROKERS`.
Step 2: If Kafka down, fallback queue must store messages to `REDIS_URL`.
Step 3: Auto-topic creation for `driver_telemetry` and `zone_state_updates`.

**Acceptance criteria:**
- [ ] High-speed ingestion API successfully emits to Kafka `driver_telemetry` topic.
- [ ] Disconnecting Kafka writes to Redis, reconnecting flushes Redis queue.

**Tests to write:**
- `it('pushes to kafka when kafka is online')`
- `it('backs up to redis when kafka throws ERR_KAFKA_UNREACHABLE')`

### Task 2 — Implement HTTP Ingestion Endpoints (Frontend API)
**Service/Module:** `backend/src/ingestion/`
**Depends on:** Task 1
**Unblocks:** Dev 4 (Frontend mapping to `/ingestion`)

**Files to create or edit:**
- `backend/src/ingestion/ingestion.controller.ts`

**What exactly to implement:**
Step 1: `POST /ingestion/batch` endpoint.
Step 2: Validates JWT token from the headers using Dev 1's setup.

**Acceptance criteria:**
- [ ] POST `/ingestion/batch` returns standard API envelope `{ success: true, data: { status: 'queued' } }`.

---

## Files This Developer Must NEVER Touch
- `backend/src/auth/`
- `backend/prisma/`
- `ml-calcultion/`
- `frontend/`

---

## Cross-Developer Dependencies
| Depends On | What You Need | When You Need It | Who Provides It |
|-----------|--------------|-----------------|----------------|
| Dev 1 | JwtAuthGuard mapped properly for ingestion controller | Task 2 | Developer 1 |

---

## Definition of Done
- [ ] All tasks completed
- [ ] Tests all passing
- [ ] Kafka produces standard agreed topics natively
