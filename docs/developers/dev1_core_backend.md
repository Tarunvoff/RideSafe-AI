# Developer 1 — Core Backend & Auth

## Quick Reference Card
- **Owns:** `backend/src/auth`, `backend/src/kyc`, `backend/src/payments`, `backend/src/plans`, `backend/src/email`, `backend/prisma`
- **Never touches:** `backend/src/kafka`, `backend/src/telemetry`, `backend/src/ingestion`, `ml-calcultion/`, `frontend/`
- **Must complete before Dev 4 can start:** Auth API (Task 1)
- **Blocked until Dev 3 completes:** None (Self-contained start)
- **Estimated complexity:** High

---

## Assigned Services / Modules
- `backend/src/auth/`
- `backend/src/email/`
- `backend/src/kyc/`
- `backend/src/payments/`
- `backend/src/plans/`
- `backend/prisma/`

---

## What Is Already Done in Their Scope
- `backend/prisma/schema.prisma`: Basic schema outline initialized.
- `backend/src/auth/`: Stub for JWT strategy and `JwtAuthGuard` exists.
- *Mostly partially implemented or stubs.*

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

### Task 1 — Implement Core Auth API
**Service/Module:** `backend/src/auth/`
**Depends on:** None
**Unblocks:** Dev 4 (Frontend Auth connection)

**Files to create or edit:**
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`

**What exactly to implement:**
Step 1: Finish `login` and `register` endpoints returning standard API response shape.
Step 2: Sign and return JWT tokens using `JWT_SECRET`.
Step 3: Handle error codes `ERR_USER_NOT_FOUND` & `ERR_AUTH_INVALID_TOKEN`.

**Acceptance criteria:**
- [ ] POST /auth/login returns `{ success: true, data: { token: '...' } }`
- [ ] JWT validates properly in `JwtAuthGuard`

**Tests to write:**
- `it('returns 401 ERR_AUTH_INVALID_TOKEN on bad credentials')`

### Task 2 — Map DB Schema and Seed
**Service/Module:** `backend/prisma/`
**Depends on:** None
**Unblocks:** Dev 2 (Needs table metadata)

**Files to create or edit:**
- `backend/prisma/schema.prisma`

**What exactly to implement:**
Step 1: Define `User`, `Plan`, `Payment` tables accurately.
Step 2: Ensure Prisma migrations run cleanly.

**Acceptance criteria:**
- [ ] `npx prisma migrate dev` succeeds against Postgres

---

## Files This Developer Must NEVER Touch
- `backend/src/kafka/`
- `backend/src/ingestion/`
- `backend/src/telemetry/`
- `frontend/mobile/`
- `ml-calcultion/`

---

## Cross-Developer Dependencies
| Depends On | What You Need | When You Need It | Who Provides It |
|-----------|--------------|-----------------|----------------|
| Dev 3 | Expected shape for ML risk profile fetch | Before Task 3 (KYC Risk Check) | Developer 3 |

---

## Definition of Done
- [ ] All tasks above completed in order
- [ ] All acceptance criteria met for every task
- [ ] All tests written and passing (zero skipped tests)
- [ ] No hardcoded URLs, ports, IP addresses, secrets, or service names anywhere in code
- [ ] Every new endpoint matches the shared API response envelope exactly
- [ ] PR description states deviations (if any)
