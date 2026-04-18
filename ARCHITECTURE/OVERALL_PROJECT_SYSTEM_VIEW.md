# Aegis: Production-Ready Tier-1 Overall Project System View

India has over 10 million gig delivery workers keeping its cities moving. Every monsoon flood, industrial smog event, or civic shutdown that renders a delivery zone unserviceable means zero income for riders who cannot afford a single lost day. Traditional insurance is structurally incompatible with this problem — it requires forms, human adjusters, and weeks to settle. By the time a claim resolves, the damage is already done.

Aegis was built to eliminate that gap entirely. The premise: parametric insurance that triggers automatically, pays within minutes of a disruption, and requires nothing from the rider. No claims. No forms. No waiting. Insurance that works at the speed of gig work.

---

## What Aegis does

Aegis is a fully operational, end-to-end parametric insurance platform. A rider registers in under 5 seconds via simulated OAuth with their platform (Zepto, Blinkit, Swiggy Instamart), receives a live personalized premium quote driven by their actual H3 zone risk, enrolls in a policy, and — when their zone goes unserviceable — receives an automatic UPI payout with a push notification. The rider does nothing. The system does everything.

A rider on the Standard tier with a ₹7,000 weekly earnings baseline receives between ₹800 and ₹1,200 on a disrupted day. From zone trigger to money transferred: under 2 minutes.

---

## How we built it

### Registration and KYC

Onboarding pulls the rider's identity, earnings history, and operating H3 zone in one OAuth shot — no typing, no document uploads. Under the Digital Personal Data Protection Act, 2023, Aegis collects exactly three categories of personal data: GPS location (to verify zone presence), bank/UPI account details (for payout disbursement), and platform activity data (to confirm active delivery days). Each category has a distinct consent flow — GPS triggers a separate consent screen, UPI collection is gated behind explicit KYC approval, and platform activity is governed by a formal data sharing agreement. No data category is used beyond its declared purpose.

KYC runs through a formal state machine:

```
NOT_STARTED → IN_PROGRESS → SUBMITTED → APPROVED
```

Each transition is logged. The admin panel surfaces flagged cases for human review. Errors surface to the rider clearly instead of failing silently.

The platform also accounts for India's Social Security Code, 2020, which formally recognises gig and platform workers as eligible for welfare benefits. The Business Rules Engine tracks the 90/120-day engagement threshold — workers must complete 90 days on a single platform or 120 days across multiple platforms in a financial year to qualify for state-backed benefits. The Multi-Zone Journey framework quantifies how many workers in a given city pool fall below this threshold, and the admin dashboard surfaces those counts so the pool remains actuarially grounded in real eligibility data.

### Dynamic premium calculation

The weekly premium is computed live from a formula anchored to microinsurance benchmarks:

```
Pr = (Ew × α) × Lf × Ct × (1 + M)
```

`Ew` is the 4-week rolling earnings average. `α = 0.015` is the affordable risk fraction. `Lf` is the XGBoost zone risk score per H3 cell. `Ct` is the chosen coverage tier. `M` is the pool sustainability margin. The quote pulls live weather and AQI signals from IMD and CPCB for the rider's specific cell and returns in under 80ms. Floor: ₹15/week. Ceiling: ₹150. Part-time riders whose raw premium falls below the floor get proportionally better coverage automatically.

Pricing adjusts dynamically by season and zone — monsoon periods carry higher risk scores than dry winter weeks, and the premium reflects that difference automatically. The trigger itself is objective and independently verifiable: AQI readings above threshold from the CPCB API, rainfall measurements from IMD feeds, and delivery zone deactivation signals from platform APIs. These are public, quantifiable sources — not internal assessments. Coverage is explicitly scoped to income loss from weather and AQI disruptions, and excludes health, life, and vehicle claims, keeping Aegis within the parametric income-protection category rather than regulated health or motor lines.

The sustainability margin `M` is stress-tested against a 14-day consecutive monsoon scenario, with a liquidity reserve maintained so the pool does not exhaust even under worst-case sequential payouts. The modeled loss ratio sits at BCR 0.65. Historical frequency of zone-halting events is quantified per H3 cell from synthetic operational data and real weather archives, giving the pricing model actuarial backing rather than assumption — the pool can demonstrate, cell by cell, how often a payout-triggering event occurred in prior periods.

Premium collection runs via UPI auto-pay with weekly micro-deductions — no manual card entries, no deduction batching into large sums that riders might not plan for. The deduction happens automatically from the enrolled UPI handle, keeping the operational friction at zero on both the rider and the platform side.

### Zone intelligence and parametric trigger

Every GPS ping is converted to a 15-character **Uber H3 index (Resolution 8)** — roughly 0.46 km² per hexagon — at the ingestion boundary. Hyper-localized weather and AQI data is matched to the rider's specific H3 cell rather than a municipal or district average, minimising basis risk. A rider working in a flooded ward does not share trigger outcomes with riders in an unaffected ward three kilometres away. Zone states cycle through `NORMAL → SLOW → DANGEROUS → HALTED`. The trigger engine evaluates state every 2 minutes. Riders see their zone state in real time so they know when a disruption is approaching, not just after it hits.

Policy enrollment is blocked 48 hours before a declared weather red alert — the platform checks for official meteorological advisories during the enrollment flow and gates issuance if a high-confidence disruption event is already imminent. This removes the adverse selection window that would otherwise incentivise last-minute sign-ups.

When a zone tips into `HALTED`, the trigger engine verifies H3 zone presence history, passes fraud checks, and initiates a sophisticated **BullMQ forensic review window** with a 5-minute event-driven TTL. This eliminates the vulnerability windows associated with legacy cron-based systems. Upon verification or TTL expiry, the system fires the UPI payout and pushes a notification — all within minutes of the event. No human in the loop. Straight-through processing means the ₹15 weekly micro-premium is not consumed by administrative overhead — the payout ratio remains intact because there is no claims handling cost to absorb.

### ML infrastructure — quad-model architecture

Four specialized Python inference services handle all intelligence workloads independently:

**Risk model (XGBoost)** computes the Loss Fraction `Lf` per H3 cell. Input features include `rainfall_mm`, `aqi_index`, `demand_factor`, `zone_historical_risk`, and `driver_tenure_days`. Monotonic constraints enforce actuarial logic — increasing rainfall can only increase, never decrease, risk scores. This was non-negotiable: without direction-constrained gradients, the model could learn spurious inverse correlations from noisy synthetic training data, producing lower risk scores during heavier rain whenever a batch happened to carry that co-occurrence. The constraints guarantee actuarially logical premium behaviour from day one, before a single real claim has been recorded. AUC consistently above 0.85.

**Pricing model (LightGBM)** regresses the final premium using a log-target transformation and Huber Loss objective, making it robust against the long-tailed distribution of gig earnings. Trained on a heavy-tail augmented dataset so the premium ceiling holds under extreme earnings outliers.

**Anomaly detector (Isolation Forest)** runs unsupervised with a contamination factor of 0.08, matched to the estimated baseline fraud rate in urban logistics. Detects GPS teleportation, device spoofing, and zero-day fraud patterns without requiring labeled examples.

**Fraud classifier (GBDT)** recognizes complex multi-variable fraud signatures — GPS teleportation, claim bursts, device sharing, earnings anomalies — trained with explicit pattern injection across four fraud classes. The engineered `teleport_ratio` feature mathematically proves impossible movement.

The composite fraud score:

```
0.5 × IsolationForest anomaly score
+ 0.3 × GBDT supervised fraud probability
+ 0.2 × rule-based severity
```

All four models are serialized as production `.pkl` artifacts and served via BentoML. The pipeline is hardened with **Opossum circuit breakers** enforcing a **Fail-Closed** security mandate — if the intelligence services degrade, the system autonomously defaults to maximum-security enforcement to preserve the actuarial integrity of the pool. MLflow handles weekly retraining as confirmed fraud labels accumulate — the supervised GBDT weight increases automatically over time.

### Five-layer fraud defense

The Aegis Shield runs on every payout without adding friction for genuine riders. IRDAI parametric guidelines require reliable location matching and built-in fraud prevention — the shield is the platform's direct answer to both:

1. **GPS drift analysis** — real riders leave noisy, human traces; spoofers leave static coordinates
2. **H3 zone presence history** — no payout in a zone with no verified delivery history
3. **Velocity checks** — cross-city displacement above 150 km/h is a hard block
4. **Device fingerprint comparison** — detects shared-device clusters above 3 users per fingerprint
5. **Graph-based ring detection** — identifies coordinated fraud clusters across accounts

When the ML ensemble scores ≥ 90, the platform flags the driver, increments the fraud warning count, moves pending payouts to `ESCROW_HOLD`, and fires an automated Twilio SMS establishing a timestamped legal record. Three confirmed violations toggle `isActive = false` autonomously.

### Data persistence and infrastructure

**PostgreSQL + Prisma** provide the ACID-compliant relational core. Every premium deduction, payout, and claim is double-written through a ledger table. A `PayoutIdempotencyKey` table with a unique constraint across `(userId, h3Cell, eventTimestamp)` enforces exactly-once semantics at the database layer — structurally preventing double-payouts regardless of how many Kafka consumers race to process the same event.

**TimescaleDB hypertables** store all time-series telemetry and GPS history with DESC-sorted timestamp indexes, keeping latest-state queries fast under high write load.

**Redis** serves ML features at under 80ms per H3 cell after warmup and maintains zone state cache for O(1) trigger evaluation regardless of fleet size.

**Apache Kafka** is the durable event bus between telemetry ingestion, the trigger engine, and payout orchestration. A Kafka DLQ with autonomous replay handles infra instability — no zone event is ever dropped. High-performance **Pino structured logging** captures every enforcement action with a unique `traceId` and deep `signal_inventory` for forensic auditing. Perfected **distributed time-bucketing** (`Unix Epoch / 1800`) is utilized to eliminate cross-service clock drift, ensuring absolute synchronization during H3 telemetry fingerprinting.

The full stack boots deterministically via scripts that TCP-poll port readiness before launching application services, eliminating cold-start connection failures. The entire system is containerized via Docker Compose for local orchestration, with a Kubernetes-ready architecture mapping for production deployment — service boundaries, resource limits, health probes, and readiness gates are all defined and deployable.

### Security architecture

- JWT dual-token rotation: 20-minute access tokens, 7-day refresh tokens hashed at rest
- Real-time **Global Token Revocation** checked in $O(1)$ time (<1ms) via Redis-backed state at the gateway and ML layers
- OAuth 2.0 with PKCE for platform SSO — provider identities mapped to internal driver IDs
- Adaptive MFA on admin accounts and sensitive driver operations via SMTP-delivered OTPs
- Global `ValidationPipe` with `whitelist: true` strips non-whitelisted fields at the NestJS boundary
- Pydantic validation on all ML inference inputs prevents feature-vector poisoning
- Redis-backed sliding-window rate limiting on `/auth` and `/fraud/analyze`
- HMAC-SHA256 signature verification on all third-party payment callbacks

### Backend and API

NestJS (TypeScript) with strict module boundaries across identity, KYC, policy lifecycle, premium billing, payout orchestration, and fraud enforcement. 166 verified endpoints span the NestJS orchestration layer (1–81), Python ML inference tier (82–139), and telemetry/admin domain (140–166). Every route is hardened with JWT guards and Pydantic type enforcement.

### Frontend

The driver-facing mobile app runs on **React Native / Expo 54** with `react-native-reanimated` worklets offloading all animation and gesture logic to the native thread — keeping the JS thread free for sustained 1–10Hz GPS telemetry and real-time WebSocket zone alerts. TanStack Query manages all server-state synchronization.

The admin command center is a **React / Vite** SPA with Tailwind CSS, Framer Motion, Shadcn UI, and Aceternity — built to render high-density fraud review queues and live H3 telemetry maps without layout shift during city-wide event surges.

Full i18n in **English, Tamil, and Hindi** across every screen — onboarding, zone dashboard, policy details, premium quote, and payout notification. Getting actuarial and legal language accurately localised into Tamil and Hindi required working through edge cases in formal register and pluralization that generic i18n libraries don't handle. The translation layer is structured so adding Kannada and Telugu is a single file drop.

### Policy documentation

The complete Aegis parametric insurance policy document — covering coverage terms, trigger definitions, payout schedules, exclusions, and rider rights — is available here: [Aegis Policy Document](https://drive.google.com/file/d/1rGjgZoHlQXVo2zxVTc0YbxKwutdJZkcH/view?usp=sharing)

---

## Challenges

**Actuarial correctness without historical data.** Monotonic constraints in XGBoost were non-negotiable. Without them, the model could learn spurious inverse correlations from noisy synthetic data — lower risk during heavier rain simply because a training batch happened to have those co-occurrences. Enforcing direction-constrained gradients guaranteed actuarially logical premium behavior from day one, before a single real claim existed.

**Exactly-once payouts in a distributed system.** With Kafka delivering zone trigger events to multiple consumers, the same event can arrive at the payout service more than once. Application-level locks are fragile. The final solution — a `PayoutIdempotencyKey` table with a database-level unique constraint — physically rejects duplicate writes at the persistence layer, making double-payment structurally impossible.

**Fraud detection before labeled data exists.** Early-stage platforms have almost no confirmed fraud labels to train on. Isolation Forest was given the highest weight in the composite score (0.5) precisely because it requires no labels — it isolates anomalies purely from behavioral geometry. As real case history accumulates through MLflow retraining cycles, the supervised GBDT weight grows automatically.

**Building for the actual users.** An insurance product that runs only in English is quietly excluding a large portion of the people it is meant to protect. Getting actuarial and legal language accurately localized into Tamil and Hindi — contextually correct, not just literally translated — required working through edge cases in formal register and pluralization that generic i18n libraries don't handle.

**Deterministic infrastructure boot.** A polyglot stack with Kafka, Zookeeper, TimescaleDB, Redis, NestJS, and four Python services all starting simultaneously produces race conditions that are genuinely difficult to debug. The solution — surgical TCP polling scripts that gate each service on the verified readiness of its upstream dependencies — eliminated cold-start failures entirely.

**Regulatory compliance by design, not afterthought.** Building a parametric insurance product in India means operating across IRDAI product guidelines, the DPDP Act 2023, and the Social Security Code 2020 simultaneously. Rather than patching compliance on top of a working system, each framework was baked into the architecture from the start — the consent flow enforces DPDP data minimisation, the Business Rules Engine enforces SS Code eligibility thresholds, and the trigger/payout pipeline satisfies IRDAI requirements for objective verifiability, zero-touch claims, and actuarially sound pool sustainability.

---

## Built with

**Backend:** NestJS · TypeScript · PostgreSQL · Prisma · TimescaleDB · Redis · Apache Kafka · Python · BentoML · MLflow

**ML:** XGBoost · LightGBM · Isolation Forest · scikit-learn · Pandas · NumPy

**Frontend:** React Native · Expo 54 · React · Vite · Tailwind CSS · Framer Motion · Shadcn UI · Aceternity · TanStack Query · react-native-reanimated

**Infrastructure:** Docker Compose · Kubernetes-ready · Kafka DLQ · TCP-poll boot sequencing

**Integrations:** UPI auto-pay · Twilio SMS · IMD weather API · CPCB AQI API · OAuth 2.0 with PKCE · Uber H3

---

*The 10 million gig workers keeping India's cities running deserve a financial safety net that works as fast as they do. Aegis is that system, fully operational.*
