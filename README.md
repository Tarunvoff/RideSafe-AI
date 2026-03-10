# GigShield  
### Parametric Income Protection for Q-Commerce Delivery Riders

**Guidewire DEVTrails 2026 — Phase 1 Submission**  
**Theme:** Ideate & Know Your Delivery Worker

---

## 1) Problem in one line

Delivery riders can lose a full day’s earnings because of events they do not control. GigShield is built to protect **income lost during verified external disruptions** — not health, not vehicle damage, not life cover.

---

## 2) Who this is for

GigShield is designed for **Q-commerce delivery riders** working on platforms like:

- Zepto  
- Blinkit  
- Instamart  
- Dunzo  

We chose this persona because Q-commerce riders work in short, intense shifts, depend on hyperlocal order flow, and are highly exposed to sudden disruptions such as rain, heat, pollution, app outages, and local access restrictions.

This product is **not** a general insurance app for everyone. It is specifically built for riders whose income can drop within hours when outside conditions turn against them.

---

## 3) What problem we are solving

A delivery rider’s earnings are highly sensitive to things outside their control:

- heavy rain can slow or halt deliveries
- extreme heat can reduce safe working hours
- dangerous air quality can make outdoor work risky
- a platform outage can stop order assignments completely
- a curfew or civic restriction can block access to pickup/drop zones

When this happens, the rider loses income immediately.

Traditional insurance products do not solve this problem well because they are designed around **damage**, **illness**, **hospitalization**, or **long claims workflows**. Our use case is different. The rider needs a fast, low-friction safety net for **income interruption**.

---

## 4) What GigShield does

GigShield is a **mobile-first, weekly parametric income protection app**.

That means:

- the rider buys a small **weekly** protection plan
- the system keeps monitoring external disruption data
- if a covered event happens in the rider’s working zone and work window, the system can start the claim flow automatically
- the rider does not need to fill a long manual claim form for every disruption

### Simple meaning of "parametric"

Parametric insurance means payout is linked to a **predefined measurable event**.

Example:

- if rainfall crosses a fixed threshold in the rider’s zone during the rider’s shift,
- and the rider has an active policy,
- the system can auto-create a claim.

So the payout is not based on a long investigation of every single case. It is based on a clear trigger rule.

---

## 5) What GigShield covers — and what it does not

### Covered
GigShield covers **loss of income** caused by verified external disruptions such as:

- heavy rain
- extreme heat
- dangerous AQI
- platform outage
- civic disruption / sudden zone restriction

### Not Covered
GigShield does **not** cover:

- health insurance
- medical bills
- accidents
- life insurance
- vehicle repair
- theft or property damage
- any loss that is not linked to a defined external trigger

This is important because the problem statement clearly requires **income loss only**.

---

## 6) Why weekly pricing

Gig workers usually think in short earning cycles. Many riders decide spending week to week, not month to month.

That is why GigShield uses a **weekly premium model**.

### Why this makes sense
- lower upfront cost
- easier to understand
- fits the rider’s earning rhythm
- flexible renewal
- more practical than monthly pricing for irregular gig income

### Sample weekly plans
- **Basic** — covers rain + heat  
- **Standard** — covers rain + heat + AQI + outage  
- **Premium** — covers all major triggers including civic disruption  

We are using a weekly structure because that matches both the problem statement and real usage behavior better than monthly plans.

---

## 7) How the rider uses the app

The app is designed for people who live on their phones while working. A desktop-first experience would not make sense here.

### Rider journey in simple steps

1. The rider installs GigShield.
2. The rider signs up using mobile number and OTP.
3. The rider completes basic KYC and work profile.
4. The rider selects work zone, platform, shift window, and income range.
5. The system calculates a weekly premium.
6. The rider pays and activates the policy.
7. The rider continues working normally.
8. In the background, GigShield monitors disruption triggers.
9. If a valid trigger happens, the system checks policy, zone, timing, and fraud signals.
10. A claim is created automatically or moved to review if suspicious.
11. The rider sees status updates in the app and receives notification.
12. Payout is sent through the configured payout path when approved.

### What the rider should feel
The rider should feel like this is a **simple protection app**, not a complicated insurance office on a phone.

---

## 8) End-to-end story: how it works in practice

Assume a Zepto rider named Arun uses GigShield.

- Arun works mostly in one city zone.
- He usually works from 2 PM to 10 PM.
- He buys a 7-day GigShield policy on Monday.
- His declared income range is based on his normal weekly earnings.

Now imagine that on Wednesday, heavy rain starts in his delivery zone during his work shift.

### What happens in the system

1. **Trigger monitor checks live data**  
   The backend checks weather data for Arun’s registered work zone.

2. **Threshold is evaluated**  
   If the rainfall crosses the threshold defined for the rain trigger, the event becomes a candidate trigger.

3. **Policy and timing are checked**  
   The system checks:
   - Is Arun’s policy active?
   - Is the trigger in his work zone?
   - Did it happen during his declared shift window?

4. **Validation happens**  
   The system confirms the event using the configured source strategy and fallback logic.

5. **Claim is created automatically**  
   If all conditions match, the system creates a claim linked to Arun’s policy.

6. **Fraud checks run**  
   The system checks for:
   - location mismatch
   - duplicate claim patterns
   - suspicious device behavior
   - invalid zone activity

7. **Payout decision is made**  
   If the claim looks clean, payout is approved. If not, it is flagged for review.

8. **Notification is sent**  
   Arun sees:
   - trigger detected
   - claim created
   - payout approved / under review / sent

This is the core value of GigShield:
**the rider does not have to fight the system during a bad day.**

---

## 9) Why mobile-first is the right platform

We chose a **mobile app** as the primary interface because delivery riders:

- already use a phone constantly during work
- need instant alerts
- need fast onboarding
- may not use laptops at all
- need policy and payout status while moving

A mobile-first product is the most natural fit for this persona.

### Planned interfaces
- **Primary:** Rider mobile app
- **Secondary later:** Admin dashboard for insurer / operations team
- **Possible later extension:** WhatsApp notification layer

For Phase 1, the rider app is the main focus.

---

## 10) User data we collect and why

We collect only the data needed to:
- verify the rider
- understand work profile
- calculate weekly premium
- validate triggers
- reduce fraud
- send payout safely

### Basic account details
- full name
- phone number
- OTP verification
- optional email

### KYC / identity
- government ID type
- masked or hashed ID reference
- date of birth
- address / city / pincode

### Work profile
- platform name
- rider / partner ID if available
- work city
- primary work zone / pincode
- shift timings
- work days per week
- delivery mode
- active platforms

### Income profile
- average daily income
- average weekly income
- self-declared earnings range
- optional earnings proof in later phases

### Payout details
- UPI ID
- payout verification
- optional bank fallback later

### Fraud-prevention signals
- device fingerprint
- app installation ID
- location permission
- zone consistency
- duplicate account checks

### Consent and declarations
- terms and conditions
- privacy policy
- location consent
- truthful declaration
- exclusion acknowledgement

---

## 11) Weekly premium model

In Phase 1, our premium engine is intentionally simple and explainable.

### Rule-based formula

**Weekly Premium = Base Rate + Zone Risk Modifier + Season Modifier − Loyalty Discount**

### Why we start with a rule-based engine
Phase 1 is about proving feasibility and clarity. A rule-based model is easier to test, easier to explain, and easier to review than jumping straight into a black-box ML model.

### Example factors
- how risky the rider’s zone is
- whether it is monsoon / summer / high-pollution season
- whether the rider has renewed for multiple weeks
- which plan the rider selected

### Why this is good for Phase 1
- transparent
- easy to demo
- easy to test
- gives a strong baseline for later ML pricing

---

## 12) Parametric triggers

Our triggers are based on **external, measurable events** that can reasonably reduce rider income.

### Trigger 1 — Heavy Rain
**Why it matters:** Deliveries slow down, rider movement becomes unsafe, and order handling is disrupted.

**Example logic:**  
Rainfall crosses a defined threshold in the rider’s zone during the rider’s shift window.

**Edge cases handled:**  
- rain in city but not rider zone  
- rain outside rider’s active work hours  
- single-source weather errors

---

### Trigger 2 — Extreme Heat
**Why it matters:** Very high temperatures reduce safe work hours and affect rider productivity.

**Example logic:**  
Temperature remains above a fixed threshold for a defined duration in the rider’s zone.

**Edge cases handled:**  
- short spikes that should not trigger payout  
- rider not active in heat window  
- general city data not matching rider’s actual zone

---

### Trigger 3 — Dangerous Air Quality
**Why it matters:** Severe pollution creates unsafe outdoor conditions and can reduce working time.

**Example logic:**  
AQI crosses a high-risk threshold at or near the rider’s work zone for a sustained period.

**Edge cases handled:**  
- city-level AQI hiding local variation  
- stale monitoring data  
- station too far from the rider’s zone

---

### Trigger 4 — Platform Outage
**Why it matters:** A rider can be ready to work but still lose income if the platform stops assigning orders.

**Example logic:**  
The system detects prolonged zero-order assignment behavior affecting a meaningful group in the same zone.

**Edge cases handled:**  
- one inactive rider should not trigger payout  
- planned maintenance windows  
- local device or connectivity issues mistaken for platform outage

---

### Trigger 5 — Civic Disruption / Zone Restriction
**Why it matters:** A rider may be unable to access pickup or drop areas due to sudden restrictions.

**Example logic:**  
A verified civic order or disruption affects the rider’s registered work zone.

**Edge cases handled:**  
- rumors or social media noise  
- city-wide reporting without zone specificity  
- late official confirmation

---

## 13) Edge cases we are actively thinking about

This product only works if it handles messy real-world situations well.

### 1. Rain in one neighborhood, not another
We do not want city-wide averages creating false payouts. Trigger logic must be as zone-aware as possible.

### 2. Rider is off-shift when disruption happens
A disruption should not create a payout if it happened completely outside the rider’s declared work window.

### 3. Rider works on multiple platforms
The product must avoid gaps and abuse if the rider works on Zepto in one slot and another platform in another slot.

### 4. API outage or missing data
If the primary data source fails, fallback logic must exist. If all critical sources fail, the system should enter a safe mode instead of making blind decisions.

### 5. Duplicate claim attempts
A rider should not be able to create multiple payouts for the same event and policy window.

### 6. GPS spoofing or fake location
Location and device consistency checks are part of the long-term fraud design.

### 7. Planned maintenance vs real platform outage
The system should not reward a known scheduled outage the same way as a sudden disruption.

### 8. Rider changes zone mid-week
Coverage needs a clear rule for primary zone vs allowed adjacent zones.

---

## 14) AI / ML plan

GigShield is not using “AI” as decoration. We have specific places where it helps.

### A) Dynamic premium calculation
In Phase 1, pricing is rule-based.  
In later phases, ML can adjust the weekly premium using:
- historical zone risk
- seasonal patterns
- forecast signals
- past claims behavior

### B) Predictive risk modeling
We want the system to estimate disruption likelihood by zone, such as:
- expected rain probability
- heat risk
- AQI risk
- repeated outage-prone zones

This can eventually improve both pricing and rider recommendations.

### C) Fraud detection
AI/ML can help detect:
- fake location behavior
- unusual claim patterns
- duplicate identity clusters
- abnormal pre-event policy surges in one zone

### D) Smart rider communication
In later phases, the app can explain:
- why premium changed
- why a claim was approved or flagged
- what disruption risk looks like for the coming week

---

## 15) Architecture overview

GigShield uses a modular architecture so that each concern stays clear and scalable.

### Rider-facing layer
- Mobile app for onboarding, policy, claim status, alerts, and renewal

### Core backend layer
- Auth service  
- Worker profile service  
- Policy service  
- Premium engine  
- Trigger monitor  
- Claims engine  
- Fraud engine  
- Payout service  
- Notification service  

### Data and integration layer
- weather data
- AQI data
- geocoding / zone mapping
- platform activity feed (mock in Phase 1)
- payment / payout sandbox
- analytics storage

---

## 16) Phase 1 architecture in plain English

In Phase 1, the product is built around five foundation blocks:

### 1. User identity and onboarding
The rider can create an account, verify identity, and define work profile.

### 2. Weekly premium engine
The system can calculate a weekly plan price clearly.

### 3. Trigger definitions
The system knows what kinds of disruption matter and how they are evaluated.

### 4. Policy model
The app can represent a rider’s active 7-day protection period.

### 5. Product prototype
The rider journey is visible and understandable through a clean mobile-first flow.

This keeps Phase 1 focused on proving the idea correctly instead of pretending everything is already production-ready.

---

## 17) Tech stack

### Frontend
- React Native + Expo  
- NativeWind / clean component-based UI  
- simple mobile-first screens for onboarding, premium view, policy view, alerts, and claims

### Backend
- NestJS (built on Node.js) for auth, policy management, notifications, and payout service skeletons
- Python / FastAPI for premium engine, trigger monitor, claims engine, and future fraud / ML workflows

### Data and jobs
- PostgreSQL for core relational data
- Redis for cache / queue support
- Celery or equivalent async worker for trigger polling and background processing

### External integrations
- Open-Meteo for weather baseline  
- OpenAQ / air-quality source strategy  
- Nominatim / OSM for geocoding and zone mapping  
- mock platform activity API for outage testing  
- payment sandbox for policy purchase / payout simulation  

### Infra
- Docker Compose for local orchestration
- GitHub for repo and phase continuity

---

## 18) Why these tech choices

### Why React Native?
One codebase, fast demo cycle, mobile-first by design.

### Why Node + Python together?
Node fits service APIs and app-facing integrations well. Python is strong for risk rules, analytics, and later ML.

### Why PostgreSQL?
Claims, policies, and payouts need structured and auditable data.

### Why Redis + async workers?
Trigger checks should run in the background, not block app requests.

---

## 19) Repository structure

```text
gigshield/
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── auth-service/
│   ├── policy-service/
│   ├── payout-service/
│   └── notification-service/
├── risk-engine/
│   ├── premium-engine/
│   ├── trigger-monitor/
│   ├── claims-engine/
│   ├── fraud-engine/
│   └── ml-models/
├── frontend-app/
│   ├── screens/
│   ├── components/
│   └── store/
├── admin-dashboard/
├── mock-platform-api/
├── infra/
└── tests/