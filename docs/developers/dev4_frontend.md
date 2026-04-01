# Developer 4 — React Native Mobile App

## Quick Reference Card
- **Owns:** `frontend/mobile/` (React Native Expo App)
- **Never touches:** `backend/`, `ml-calcultion/`
- **Must complete before Dev 1 can start:** None
- **Blocked until Dev 1 completes:** Needs Auth endpoints stable
- **Estimated complexity:** Medium

---

## Assigned Services / Modules
- `frontend/mobile/`

---

## What Is Already Done in Their Scope
- Bootstrapped Expo app, some structural folders (`components/`, `hooks/`, `constants/`).
- Only basic entrypoint `App.tsx` available. No API logic wired.

---

## Shared Contract Spec (Read This Before Writing Any Code)

> This section is identical across all 4 developer documents. It is the single source of truth.
> You may not deviate from any contract defined here. If you need a change, it must be agreed upon
> and this spec must be updated before any code is written.

### A. API Response Envelope
Specify the standard response shape all backend endpoints must return. The client fetch wrapper must parse this.
```json
// Success
{ "success": true, "data": <payload>, "meta": <pagination> }
// Error
{ "success": false, "error": { "code": "STRING_CODE", "message": "string", "details": {} } }
```

### B. Authentication Contract
- Token format: JWT
- Header name and format: `Authorization: Bearer <token>`
- The Frontend must store this securely (SecureStore) and attach to ALL further network requests.

### C. Database Schema Contract
N/A (Frontend does not hit raw DB), relies purely on API envelopes.

### D. Environment Variable Registry
- `EXPO_PUBLIC_API_URL` (string, required, e.g. `http://localhost:3000`)

### E. Inter-Service Event/Message Contract
- Topic `driver_telemetry`: `{ driverId: UUID, lat: Float, lon: Float, timestamp: ISO8601, speed: Float }`
- Frontend mimics this schema natively before POSTing to the `/ingestion/batch` endpoint.

### F. Error Code Registry
- `ERR_AUTH_INVALID_TOKEN` (Frontend must log out user and send to AuthScreen)
- `ERR_USER_NOT_FOUND`
- `ERR_KAFKA_UNREACHABLE`

---

## Tasks — Ordered by Dependency (Complete in This Exact Sequence)

### Task 1 — Build Client API Fetch Wrapper & Auth Storage
**Service/Module:** `frontend/mobile/src/api/`
**Depends on:** None (Build it abstractly)
**Unblocks:** All future API requests from the app.

**Files to create or edit:**
- `frontend/mobile/src/api/client.ts`

**What exactly to implement:**
Step 1: Write an Axios/Fetch wrapper that reads `EXPO_PUBLIC_API_URL` from `.env`.
Step 2: Force it to append the `Authorization` header on all outbound requests if JWT exists in storage.
Step 3: Force it to recognize the exact API Envelope.
Step 4: Intercept 401s or `ERR_AUTH_INVALID_TOKEN` to clear auth state and trigger app navigation.

### Task 2 — Implement Driving Telemetry Sender
**Service/Module:** `frontend/mobile/src/services/`
**Depends on:** Task 1
**Unblocks:** None

**Files to create or edit:**
- `frontend/mobile/src/services/telemetry.ts`

**What exactly to implement:**
Step 1: Implement an Expo Location background watcher.
Step 2: Collect location shapes matching `{ driverId, lat, lon, timestamp, speed }`.
Step 3: Perform standard `POST /ingestion/batch` natively.

---

## Files This Developer Must NEVER Touch
- `backend/`
- `ml-calcultion/`
- `docker-compose.yml`

---

## Cross-Developer Dependencies
| Depends On | What You Need | When You Need It | Who Provides It |
|-----------|--------------|-----------------|----------------|
| Dev 1 | Working `POST /auth/login` for E2E testing | Before Beta Review | Dev 1 |
| Dev 2 | Working `POST /ingestion/batch` for map events | Before Task 2 E2E | Dev 2 |

---

## Definition of Done
- No hardcoded `localhost:3000`. Exclusively `EXPO_PUBLIC_API_URL`.
- Clean error handling (no app crashes on network disconnection).
- Token securely stored.
