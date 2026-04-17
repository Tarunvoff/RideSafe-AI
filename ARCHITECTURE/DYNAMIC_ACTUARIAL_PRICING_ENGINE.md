# Aegis Dynamic Actuarial Pricing Engine
## Algorithmic Stratification. Mathematical Solvency. Tier-1 Predictability.

### Executive Overview
Traditional insurance architectures operate on static, flat-rate tables. This creates severe basis-risk and inevitable capital-bleed when unmodeled localized disasters occur. The **Aegis Actuarial Pricing Engine** structurally eradicates this by computing premium yields dynamically. Utilizing a confluence of driver telemetry, real-time machine learning, and regulatory pricing boundaries, Aegis calculates exact, fair-market risk down to the individual Uber H3 Grid cell.

---

### 1. The Core Algorithmic Calculus: $Premium \approx (E_w \times L_f \times C_t)$
Every billing cycle, the `PremiumService` calculates the driver’s specific rate based on three heavily guarded algorithmic pillars:

#### Pilar A: The Earnings Base ($E_w$)
*   **Data Sourcing:** Extracts the `aggregate weekly earnings` directly from the `DynamicQCommerceService` (via integrations with Blinkit/Zepto/Instamart/JioMart/BigBasket).
*   **New Driver Fallbacks:** If a driver lacks historical telemetry, the engine defaults to a `cohortCandidate` metric—calculating the `activeDays` ratio to synthesize a mathematically fair earnings baseline ($E_w$) without overcharging.

#### Pilar B: The Location Risk Factor ($L_f$)
*   **The H3 Oracles:** Aegis isolates the driver’s primary operating environment utilizing precise Uber H3 Hexagonal boundaries (Resolution 8).
*   **XGBoost ML Fusion:** The H3 identifier is pushed to our internal Python ML endpoints (`mlServiceUrl/risk/score`). The model evaluates trailing `rainfall_mm`, `aqi`, `demand_ratio`, and `historical_risk` to generate a multidimensional $L_f$ float score reflecting exact environmental peril.
*   **Cache Determinism:** To prevent extreme ML latency blocking the billing chron-job, $L_f$ calculations are vaulted in a sub-millisecond Redis state buffer. 

#### Pilar C: The Coverage Tier Factor ($C_t$)
*   **Plan Stratification:** Bound to the exact `weeklyPlanId` selected by the user (e.g., Standard Guard vs. Elite Protection). 

### 2. IRDAI "Price-Gouging" Bounds & Regulatory Floors
An entirely unbounded dynamic formula violates IRDAI consumer protection strictures. 
*   **The Safety Math:** Before any premium is serialized to a `PremiumInvoice`, Aegis pushes the raw yield through the `applyPremiumBounds(rawPremium, tierCap, tierFloor)` function.
*   **Execution:** Regardless of how severe the $L_f$ ML score spikes during a storm, the premium mathematically cannot breach the regulatory `tierCap`. Similarly, even if risk is zero, the algorithm respects the `tierFloor`, ensuring the overarching Liquidity Reserve is never theoretically starved of incoming capital.

### 3. Financial Pipeline Integrity 
Unlike standard manual invoicing, this calculated value is instantly mapped to Razorpay via the `RECURRING_BILLING_DEBIT_WEBHOOK_URL`. If the webhook process stutters, the system triggers internal `PremiumChargeAttempt` retries, guaranteeing the `Actuarial Control Plane` reflects 100% accurate financial states.

---
**Engine Status:** *Dynamic. Bounded. Authoritative.*
