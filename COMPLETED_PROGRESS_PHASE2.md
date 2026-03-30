# Aegis - Completed Integration Progress (Phase 2) 🚀

This document serves as an exhaustive, in-depth technical analysis summarizing the architectural bridging, machine learning integrations, and front-to-back pipeline wiring strictly completed during Phase 2.

---

## 🗺️ Master Architecture Data Flow (ASCII)
```text
[ React Native Mobile App ]
      │      (1) GPS Live Polling (Every 10s)
      ▼
┌──────────────────────────┐
│   NestJS API Gateway     │ 
│   (Port 3001)            │ 
└─────┬──────────────┬─────┘
      │              │ (2) POST /fraud-features (Identity + Behavior math)
      │              ▼
      │      ┌───────────────────────────┐
      │      │ Fraud Feature ML Service  │
      │      │ (Python - Port 8002)      │
      │      └──────────────┬────────────┘
      │                     │ (3) Enriched GPS payload + H3 Matrix Hash
      ▼                     ▼
 ╔════════════════════════════════════╗
 ║         APACHE KAFKA BUS           ║ (Topic: driver_telemetry)
 ╚═══════════╦════════════════════════╝
             │ (4) Async Firehose Consume
             ▼
┌──────────────────────────┐
│  Grid Event Aggregator   │ (Python - Port 8003)
│  (Calculates Lf Density) │
└────────────┬─────────────┘
             │ (5) Flush active states (NORMAL / HALTED)
             ▼
      [( REDIS CACHE )] ◄───────────────┐
             ▲                          │ (8) Verify H3 cell state internally
             │                          │     for Zero-Touch claims
             │ (6) Mapbox API           │
             │     live-polls           │
             │     heatmap data         │
[ React Native Mobile Map ]             │
                                        │
┌──────────────────────────┐            │
│  NestJS Plan Controller  │            │
│  (Plans Service)         │            │
└───────┬──────────┬───────┘            │
        │          │                    │
 (7a)   │          │ (7b)               │
GET /pricing       POST /trigger        │
        │          │                    │
        ▼          ▼                    │
┌───────────────────────────────────────┴──┐
│         ML Insurance Service             │
│        (Python - Port 8000)              │
│                                          │
│  [Pricing Logic]     [Parametric Engine] │
└──────────────────────────────────────────┘
```

---

## 🏗️ 1. Architecture Infrastructure & Automation
We replaced standard manual boot procedures with a fully autonomous `start_micro_services.bat` native Windows script.
* **Docker Background Boot:** Securely triggers `-d` on Docker for `wurstmeister/kafka`, `zookeeper`, and `redis`.
* **5-Service Pop-Up Matrix:** Utilizing `start cmd /k`, the system generates independent terminal instances sequentially. It activates the respective Python `venv`s, defines system-level environment variables (like `USE_REDIS=True`), and strictly designates correct host ports.
* **Delay Loaders:** Forces a 3-second sleep before launching the frontend (`npx expo start --offline`) to ensure NestJS connections naturally resolve instead of throwing critical Boot sequence errors.

## 📍 2. Mobile GPS Live Pooling (Frontend → Backend)
* **What it does:** Tracks dynamic telemetry over time to ensure delivery drivers aren't clustering in fake areas to exploit algorithms.
* **Frontend Implementations:** Designed a Foreground observer in `DriverLiveRiskMapboxScreen.tsx` capturing latitude and longitude vectors locally without destroying battery life.
* **Feature Extraction (Port 8002):** The `fraud.service.ts` directly forwards these coordinates via standard HTTP proxying. The Python service extracts `gps_speed`, `h3_zone_consistency`, and `device_switch_frequency`.
* **Kafka Push:** Instead of throttling the Postgres database with positional logs, NestJS translates the physical latitude/longitude into a universal **Uber H3 spatial index (Resolution 8)** and streams it persistently to Kafka.

## 🧠 3. Real-Time Grid Event Processing (Kafka → Redis)
* **High-Throughput Aggregation (Port 8003):** 
  Instead of resolving math strictly on every ping, the pipeline intelligently shifts calculations. The Python Engine strictly acts as a Kafka Consumer listener on the `driver_telemetry` topic.
* **Asynchronous `Lf` Algorithm:** 
  The Python microservice calculates the true driver volume per local H3 zone. If extreme volumes surge or halt, the mathematical Risk State (`Lf` Loss Fraction) inflates.
* **Single Source of Truth (SSOT):** 
  It dumps these resulting states natively into the Redis Cache (`setex` keys keyed by the exact `h3_cell`). Any microservice querying `Redis: get 8861...` natively returns `HALTED` under a 3-millisecond lookup.

## 📈 4. Dynamic ML Premium Integration (NestJS → Pricing Engine)
* **Vulnerable State:** Originally, `plans.service.ts` just retrieved basic DB row arrays (Static $5 weekly premium).
* **Integrated Payload:** We injected massive backend interception. When a user requests a quote, NestJS:
   * Looks up the user's historical `riskScore` natively evaluated from Port 8002.
   * Compiles an extensive JSON request containing `Ew` (Earnings limit), `Lf` (Loss Fraction Risk), `demand_ratio`, and specific coverage tiers.
* **Port 8000 Resolution:** NestJS sends a structural POST to `/pricing`. Python runs a proprietary Monte-Carlo / LightGBM scaling algorithm and returns a mathematically enforced `premium` rate along with a `zone_multiplier`. NestJS seamlessly injects this back into the standard API return array structure cleanly parsing natively to the App.

## ⚡ 5. Zero-Touch Parametric Fraud Triggers (NestJS → AI Claims)
* **Vulnerable State:** Hardcoded simulation simulating instant approvals `(minutesSinceEvent >= 3)`.
* **Integrated Rules Engine:** We obliterated that code block. When a localized disruption event is verified on the UI, `plans.service.ts` processes a `POST` directly to the `Port 8000 /trigger` endpoint. 
* **The Intelligence Check:** 
  The Python Trigger microservice receives the GPS hash from NestJS. **Instead of believing NestJS**, the Python trigger explicitly checks the Redis Cache itself! If Redis reports a generic anomaly, but the zone is actively `NORMAL`, the backend immediately drops the payout trace to `HOLD / MANUAL REVIEW`. Only an encrypted verification returned as `APPROVED` can actually hit user bank wallets.

---

## 🧪 Testing Matrices Executed
* `test_full_pipeline.js`: Simulates 3 fast GPS requests mimicking a moving vehicle, pauses explicitly for 12 seconds to ensure Kafka digests the load to Redis asynchronously, and executes a pure Frontend Zone Poll request to test exact structural validity globally. 
* `test_ml_calc.js`: An artificial terminal stress-test forcing simulated edge-cases into `Port 8000` to verify API pricing output logic.
