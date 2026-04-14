# Aegis-AI Backend (NestJS)

This service is the system of record for policies, payouts, fraud checks, and telemetry. It enforces the policy rules and payout gating logic.

## What This Service Owns
- Policy enrollment and policy lifecycle
- Orchestrated payout decisions
- Fraud score retrieval and blocking
- Redis state for drivers, policies, and zones

## Policy Rules (Enforced)
- Only three plans: BASIC, STANDARD, PREMIUM
- Fixed Ct mapping: BASIC=0.4, STANDARD=0.6, PREMIUM=0.8
- Premium formula: Pr = Ew * 0.015 * Lf * Ct * (1 + M), M=0.1
- Trigger only when zone_state == HALTED
- Payout requires active policy, valid period, and zone match
- Fraud blocks payout when fraudScore > 0.7

## Data Flow
### 1) Policy Enrollment
- Input: driverId + plan
- Fetch Ew and Lf
- Compute premium
- Assign H3 zone from driver state
- Create policy + cache policy state in Redis

### 2) Orchestrated Process
- Fetch policy
- Read zone_state from Redis
- If zone_state != HALTED -> NO_TRIGGER
- Fraud check (fraudScore in Redis)
- Compute payout -> execute payout

### 3) Direct Payout Guard
- /payout/process enforces policy ownership + zone match + HALTED zone

## Key Endpoints
### POST /policy/enroll
Request:
```json
{
  "driverId": "drv_...",
  "plan": "STANDARD"
}
```
Response:
```json
{
  "driverId": "drv_...",
  "plan": "STANDARD",
  "Ct": 0.6,
  "Ew": 8000,
  "Lf": 0.4,
  "premium": 31.68,
  "zone": "8860145b49fffff",
  "status": "ACTIVE",
  "validFrom": "2026-04-02T00:00:00.000Z",
  "validTo": "2026-04-09T00:00:00.000Z"
}
```

### POST /insurance/process/:driverId
Response:
```json
{
  "plan": "STANDARD",
  "Ct": 0.6,
  "premium": 31.68,
  "payout": 324.88,
  "decision": "NO_TRIGGER",
  "transactionId": null
}
```

### POST /payout/calculate
- Requires active policy
- Returns payout estimate based on Ew, Lf, Ct

### POST /payout/process
- Enforces policy ownership, zone match, and HALTED zone

## Redis Keys
- driver:{driverId} -> last_location, fraudScore
- policy:{policyId} -> plan, Ct, zone, premium
- zone:{h3_cell} -> Lf, zone_state

## Env Vars
- DATABASE_URL
- REDIS_URL
- FRAUD_BLOCK_THRESHOLD (default 0.7)

## Local Run
```bash
cd backend
npm install
npm run start:dev
```

## Database Notes
- Sync schema: npm run db:push
- Seed plans: npm run db:seed
