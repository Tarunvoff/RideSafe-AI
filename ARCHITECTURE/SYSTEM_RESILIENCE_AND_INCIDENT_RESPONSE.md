# Aegis System Resilience & Incident Response
## Absolute Resilience. Cold-Start Autonomy. Zero Data Loss.

### Executive Overview
In Tier-1 InsurTech, a platform is not judged by how it operates during sunny days, but by its determinism during catastrophic infrastructural failure. The **Aegis Disaster Recovery (DR) matrix** is engineered for absolute resilience. If an entire AWS Availability Zone collapses, or if core microservices lose temporal alignment, Aegis ensures that financial ledgers do not corrupt, premium pools remain mathematically sound, and pending claims execute gracefully upon restoration.

---

### 1. The Kafka Dead Letter Queue (DLQ) Replay Strategy
During a "Black Swan" event (e.g., severe internet outages during a flash flood), the system may experience thousands of concurrent weather-trigger webhooks while the database is locked.
*   **The DLQ Vault:** Aegis explicitly isolates failed spatial events into the Postgres `kafka_dlq` table rather than dumping them from memory. 
*   **Deterministic Replay:** When the orchestrator recovers, it does not process these events blindly. `idempotencyKey` bindings ensure that replayed payouts are filtered against the `premiumLedgerEntry`, permanently eliminating the risk of double-spend during post-incident recovery.

### 2. Opossum Circuit Breakers & "Fail-Closed" State
Aegis rejects the standard "Fail-Open" API architecture.
*   **External Oracle Failure:** If OpenWeather, TomTom, or Razorpay API clusters experience a regional outage, the `Opossum` circuit breakers trip instantly. 
*   **Safe Degradation:** Rather than falling back to historical guessing or pushing unauthorized claims, the Aegis backend defaults to `INSUFFICIENT_DATA_STATE`. Active gig-worker policies remain vaulted, and payout processing freezes safely to protect the central liquidity reserve until upstream Oracle integrity is cryptographically verified and restored.

### 3. Redis AOF & Sub-Millisecond Revocation Restoration
Fraud rings explicitly target platforms during network outages, hoping that "revoked" access tokens are temporarily forgotten.
*   **Append-Only File (AOF) Persistence:** Our Redis layer handles the `Sentinel Fraud Architecture` global revocation list. By utilizing AOF persistence, even if the Redis cluster is destroyed and rebooted, all blocked GPS-spoofers, jailbroken devices, and burned JWTs are reloaded into memory in $O(1)$ time, guaranteeing that a reboot does not open a temporary backdoor.

### 4. RTO & RPO Metrics
*   **Recovery Point Objective (RPO):** Near-Zero. Leveraging PostgreSQL Write-Ahead Logs (WAL), every premium charge attempt and mandate state is immutably written to disk before an API acknowledgment is returned.
*   **Recovery Time Objective (RTO):** < 15 Seconds. The `start_all.bat` execution orchestration instantly auto-heals dangling legacy node connections and boots the Dockerized infrastructure and deep ML Python layers symmetrically. 

---
**DR Matrix Status:** *Hardened. Replayable. Authoritative.*
