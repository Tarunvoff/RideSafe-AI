# Aegis Zero-Trust Identity & KYC Vaulting Matrix
## Cryptographic Isolation. DPDP Supremacy. Ephemeral Context.

### Executive Overview
Aegis handles Tier-1 Personally Identifiable Information (PII) including Aadhaar documents, PAN verifications, and active UPI banking paths. To comply comprehensively with the **DPDP Act 2023**, the architecture views Identity not merely as "data", but as **Vaulted Cryptographic Assets**. The system does not implicitly trust any internal service with raw KYC data unless explicitly mandated by the settlement layer.

---

### 1. Tiered Identity Schema Architecture
Identity is structurally isolated in the Prisma Database to prevent bulk exposure.
*   **The Decoupling:** General application routing utilizes the `User` table (Driver UUID, ephemeral tokens). Heavy KYC is entirely segregated into `KYCBasicIdentity` and `KYCIdentityVerification`. 
*   **Tokenized Linking:** If an analyst views a user's payout history on the `Admin Control Plane`, the system physically does not join the Aadhaar or PAN columns unless a DPDP-compliant overriding authorization trace is executed.

### 2. Encryption-at-Rest & Vaulting
*   **Media Security (`aadhaarDocUrl` / `panDocUrl`):** KYC document uploads are not served statically. They are blinded behind signed, short-lived uniform resource locators. 
*   **Financial Mandate Obfuscation:** Bank logic within `KYCPayoutSetup` and `BillingMandate` structures operate primarily via Razorpay `providerMandateId` string references. Aegis does not store active banking passwords; it stores cryptographic references mapped natively to the `user` via the `financialDataConsent` boolean flag.

### 3. The "Right to be Forgotten" Teardown
Under Indian DPDP Law, when a gig worker initiates data deletion, "soft deletes" (flagging `is_active: false`) are legally insufficient.
*   **Cascading Cryptographic Burn:** Aegis executes a hard-delete cascade. Deleting a `User` entity systematically drops all linked `KYCPersonalDetails`, `LocationTrace` arrays, and `PremiumInvoice` PII mappings.
*   **Ledger Anonymization:** For actuarial compliance, financial receipts in the ledger are stripped of Driver PII but the base quantitative metadata remains, ensuring the `ReserveSustainabilityService` calculations are not mathematically derailed by missing historical pricing data.

### 4. Real-Time Revocation Middleware
As mapped in the `Sentinel Fraud Architecture`, if a driver's session is hijacked, the JWT is immediately inserted into the global Redis Denylist. The `TokenRevocationMiddleware` evaluates this instantly, violently terminating any active KYC data ingestion pipes from that session before malicious data can write to Postgres.

### 5. Elite Dual-Track Provisioning
Aegis empowers users with **Total Identity Choice** between two parallel, industrial-grade paths:
*   **The Master Flow:** Detailed technical deep-dive on Automated OAuth vs. Universal Identity Path in [ELITE_IDENTITY_PROVISIONING_AND_MANUAL_KYC_MASTERY.md](./ELITE_IDENTITY_PROVISIONING_AND_MANUAL_KYC_MASTERY.md).
*   **Forensic Parity:** Regardless of the chosen path, all entries are bridged into the `FraudAnalysis` core for unified security enforcement.

---
**Vault Status:** *Encrypted. Segregated. Authoritative.*
