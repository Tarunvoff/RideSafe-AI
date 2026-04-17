# Aegis Security and Fraud Matrix: Zero-Trust Defense Grid

## Executive Summary
The Aegis platform operates on a **Zero-Trust Gig-Economy Defense Grid**, a multi-layered security architecture designed to maintain cryptographic identity integrity and adversarial resilience in high-concurrency environments. The perimeter is hardened through automated anomaly detection, edge-level rate limiting, and a cryptographically verified identity pipeline. This matrix serves as the definitive forensic guide to the platform's security posture and the operational mechanics of the "Aegis Shield" fraud defense infrastructure.

---

## 1. Authentication and Identity Flow
Identity within Aegis is managed through a tiered cryptographic verification system, ensuring that every request is bound to a verified principal with restricted lateral mobility.

### 1.1 JSON Web Token (JWT) Implementation
The system utilizes a dual-token rotation strategy for session management and privilege enforcement.
*   **Access Tokens**: Short-lived (20 minutes default), signed via SHA-256 HMAC, containing the `sub` (User ID), `email`, and `role`.
*   **Refresh Tokens**: Long-lived (7 days default), hashed and persisted in the relational core (`refreshToken` column) to prevent replay attacks and facilitate immediate session invalidation.

### 1.2 Federated Identity (OAuth 2.0 / SSO)
Aegis integrates with major gig-economy providers (Swiggy, Zomato, Zepto) to establish a "Network of Trust."
*   **Flow**: Authorization Code Grant with optional PKCE (Proof Key for Code Exchange) support.
*   **Internal Mapping**: Provider identities are mapped to a unique internal `driverId`, ensuring that first-party auditing remains consistent regardless of the third-party source.

### 1.3 Adaptive MFA (Multi-Factor Authentication)
High-privilege accounts (Admin) and sensitive driver operations (Login/Reset) are protected by an adaptive MFA layer.
*   **Mechanism**: 6-digit numeric OTPs generated via secure random entropy.
*   **Verification**: SHA-256 hashing of OTPs prior to persistence, with a strict 10-minute expiration window.

| Security Component | Implementation Detail | Enforcement Layer |
| :--- | :--- | :--- |
| **Auth Guard** | NestJS `JwtAuthGuard` | Controller / Route Edge |
| **Role Guard** | Declarative `@Roles(Role.ADMIN)` | Method-Level Interception |
| **Session State** | Redis-backed TTL (900s) | `RedisStateService` |
| **MFA Source** | SMTP-based OTP Delivery | `EmailService` |

---

## 2. The "Aegis Shield" (Operational Fraud Defense)
The Aegis Shield is an active enforcement infrastructure that translates ML-driven probability into operational reality. It operates through three distinct layers of forensic scrutiny.

### 2.1 Defense Layers

| Layer | Domain | Forensic Vector |
| :--- | :--- | :--- |
| **Layer A** | **Device Intelligence** | Detects hardware spoofing, SIM swapping, and shared-device clusters (>3 users per hardware fingerprint). |
| **Layer B** | **H3 Burst Detection** | Identifies high-density "Flash-Mob" fraud within specific hexagonal H3 cells (Simultaneous claims from close proximity). |
| **Layer C** | **Geometric Defense** | Velocity checks (>150km/h physically impossible for gig-transit) and teleportation detection (Instantaneous H3 cell jumps). |

### 2.2 Operational Enforcement Loop
When the ML ensemble return a high-confidence fraud signal (Risk Score $\geq 90\%$), the **Active Enforcement Engine** triggers an irrevocable compliance sequence:

1.  **Database Flagging**: The system increments the `fraudWarningCount` for the driver identity.
2.  **Autonomous Suspension**: Upon the 3rd violation, the user's `isActive` flag is toggled to `FALSE`, effectively freezing all access.
3.  **The "Compliance Hammer" (Twilio SMS)**: An automated, legal-timestamped SMS is dispatched via the Twilio gateway.
    *   **Logic**: Dispatched by `enforcement_engine.py` (Python) or authenticated internal backend services.
    *   **Purpose**: Establishes a "Safe-Harbor" legal position for the insurer by providing real-time notification of suspected breach of contract.
4.  **Payout Hold**: All `PENDING` disbursements for the policy are moved to an `ESCROW_HOLD` state pending manual forensic review.

---

## 3. Network Security and Payload Sanitization
Aegis enforces a "Strict-Schema" policy at every boundary to eliminate the possibility of injection attacks or payload tampering.

### 3.1 Perimeter Sanitization
*   **NestJS (Edge)**: Global `ValidationPipe` utilizes `class-validator` to enforce strict DTO (Data Transfer Object) adherence. Non-whitelisted fields are stripped at the boundary (`whitelist: true`), and invalid types trigger immediate `400 Bad Request` responses.
*   **ML-Services (Internal)**: All inference inputs are validated via `Pydantic` models, ensuring that the feature vectors are mathematically sound and free from adversarial data poisoning.

### 3.2 Redis-Backed Rate Limiting
To prevent Distributed Denial of Service (DDoS) attacks and brute-force claim bursts, Aegis implements a sliding-window rate limiter using Redis.
*   **Scope**: Applied globally to the `/api` prefix and specifically hardened for `/auth` and `/fraud/analyze`.
*   **Policy**: Enforced via a custom interceptor or Throttler logic, utilizing the `rate_limit:{ip}:{identity}` key pattern with 1Hz and 10Hz burst windows.

---

## 4. Threat Vector Matrix

| Threat Vector | Mitigation Strategy | Defense Mechanism |
| :--- | :--- | :--- |
| **Brute Force** | OTP Hashing + Exponential Backoff | `AuthService` + Redis Throttling |
| **SQL Injection** | Parameterized Queries (Prisma) | `PrismaService` |
| **XSS / CSRF** | Strict CORS + Content-Security Policy | NestJS CORS Module |
| **Replay Attack** | JWT Refresh Token Rotation | `generateTokens` Logic |
| **Identity Theft** | Federated OAuth + Mandatory MFA | Swiggy/Zomato SSO Integrations |
| **Systemic Fraud** | Aegis Shield ML Ensemble | `FraudService` (Python/NestJS) |

---

**AUDIT CERTIFIED: AEGIS DEFENSE GRID v1.0**
**Forensic Status: HARDENED**
