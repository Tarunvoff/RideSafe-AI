# Fraud Detection - Visual Guide

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    KYC Flow (6 Steps)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Basic Identity                                     │
│  ├─ Full Name                                               │
│  ├─ Date of Birth                                           │
│  └─ Gender                                                  │
│         ↓                                                    │
│  Step 2: Personal Details                                   │
│  ├─ Address                                                 │
│  ├─ City                                                    │
│  ├─ State                                                   │
│  └─ Pincode                                                 │
│         ↓                                                    │
│  Step 3: Identity Verification                              │
│  ├─ Aadhaar Number                                          │
│  └─ PAN Number                                              │
│         ↓                                                    │
│  Step 4: Payout Setup                                       │
│  ├─ UPI ID or                                               │
│  └─ Bank Account Details                                    │
│         ↓                                                    │
│  Step 5: Fraud Detection ⭐ NEW                             │
│  ├─ GPS Analysis                                            │
│  ├─ Device Integrity Check                                  │
│  ├─ Network Analysis                                        │
│  └─ Risk Score Calculation                                  │
│         ↓                                                    │
│  Step 6: Submitted                                          │
│  └─ Confirmation                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Fraud Detection Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← | Step 5 of 6                                            │
├─────────────────────────────────────────────────────────────┤
│  Fraud Detection                                    83%      │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GPS Spoofing Analysis                                       │
│  We analyze your device for fraud indicators to ensure      │
│  security.                                                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛡️  Device Security Check                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Device Integrity        🔒 Normal Device            │   │
│  │ Network Type            📡 Standard Network         │   │
│  │ Velocity Check          ✓ Within Range             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ℹ️  This analysis checks for GPS spoofing, device         │
│  tampering, and suspicious network activity.               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         [Analyze Device]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Risk Analysis Result Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← | Step 5 of 6                                            │
├─────────────────────────────────────────────────────────────┤
│  Fraud Detection                                    83%      │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Status: INCONCLUSIVE                            │   │
│  │     Medium Risk                                     │   │
│  │                                                     │   │
│  │ Fraud Risk Index                                    │   │
│  │ 52%                                                 │   │
│  │ +12% from avg                                       │   │
│  │                                                     │   │
│  │ Analysis Details                                    │   │
│  │ • GPS signals exhibit inconsistent timing offsets  │   │
│  │ • Non-linear movement telemetry detected           │   │
│  │                                                     │   │
│  │ ┌──────────┬──────────┬──────────┐                 │   │
│  │ │ 🔓 Device│ 📡 Network│ ✓ Velocity│                │   │
│  │ │ Rooted   │ Premium  │ Within   │                │   │
│  │ │ Device   │ VPN      │ Range    │                │   │
│  │ └──────────┴──────────┴──────────┘                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         [Continue]                                  │   │
│  │         [Re-analyze]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Risk Score Visualization

```
Low Risk (0-30%)
┌─────────────────────────────────────────────────────────────┐
│ ✓ Approved Automatically                                    │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│ │ 15%                                                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Medium Risk (30-60%)
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Manual Review Required                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│ │ 52%                                                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

High Risk (60-100%)
┌─────────────────────────────────────────────────────────────┐
│ 🚨 Manual Review Required                                   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░ │   │
│ │ 75%                                                  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Admin Review Interface

```
┌─────────────────────────────────────────────────────────────┐
│  ← | Fraud Reviews                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Fraud Submissions Pending Review                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ user@example.com                            52%     │   │
│  │ +91-9876543210                                      │   │
│  │ INCONCLUSIVE                                    →   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ another@example.com                         78%     │   │
│  │ +91-9876543211                                      │   │
│  │ INCONCLUSIVE                                    →   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ third@example.com                           25%     │   │
│  │ +91-9876543212                                      │   │
│  │ INCONCLUSIVE                                    →   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Admin Detail Review Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← | Fraud Review Detail                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User: user@example.com                                     │
│  Phone: +91-9876543210                                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Status: INCONCLUSIVE                            │   │
│  │     Medium Risk                                     │   │
│  │                                                     │   │
│  │ Fraud Risk Index: 52%                               │   │
│  │                                                     │   │
│  │ GPS Coordinates: 40.7128, -74.0060                 │   │
│  │ Device: Rooted Device                               │   │
│  │ Network: Premium VPN                                │   │
│  │ Velocity: Within Range                              │   │
│  │                                                     │   │
│  │ Risk Factors:                                       │   │
│  │ • GPS signals exhibit inconsistent timing offsets  │   │
│  │ • Device integrity compromised                     │   │
│  │ • Premium VPN detected                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Review Decision:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ Approve                                           │   │
│  │ ○ Reject                                            │   │
│  │ ○ Inconclusive                                      │   │
│  │                                                     │   │
│  │ Notes: ___________________________________          │   │
│  │        ___________________________________          │   │
│  │                                                     │   │
│  │         [Submit Review]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────┐
│  User Device     │
│  ┌────────────┐  │
│  │ GPS Module │  │
│  └────────────┘  │
│  ┌────────────┐  │
│  │ Device Info│  │
│  └────────────┘  │
│  ┌────────────┐  │
│  │ Network    │  │
│  │ Detection  │  │
│  └────────────┘  │
└────────┬─────────┘
         │ HTTP POST
         ▼
┌──────────────────────────────────────┐
│  Backend API                         │
│  POST /fraud/analyze                 │
│  ┌──────────────────────────────────┐│
│  │ Validate Input                   ││
│  │ Calculate Risk Score             ││
│  │ Store Analysis                   ││
│  │ Return Results                   ││
│  └──────────────────────────────────┘│
└────────┬─────────────────────────────┘
         │ JSON Response
         ▼
┌──────────────────────────────────────┐
│  Frontend UI                         │
│  ┌──────────────────────────────────┐│
│  │ Display Risk Score               ││
│  │ Show Analysis Details            ││
│  │ Render Status                    ││
│  │ Enable Continue/Re-analyze       ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
         │
         ├─ Low Risk (0-30%)
         │  └─ Auto-approved
         │     └─ Continue to Submitted
         │
         ├─ Medium Risk (30-60%)
         │  └─ Flagged for review
         │     └─ Admin reviews
         │        └─ Approve/Reject
         │
         └─ High Risk (60-100%)
            └─ Requires review
               └─ Admin reviews
                  └─ Approve/Reject
```

## Risk Factor Breakdown

```
GPS Spoofing Detection
├─ Coordinates at 0,0 ..................... +30 points
├─ Out of range coordinates .............. +40 points
└─ Timing inconsistencies ................ Analyzed

Device Integrity
├─ Rooted Device (Android) ............... +20 points
├─ Jailbroken Device (iOS) ............... +25 points
└─ System tampering ...................... Analyzed

Network Analysis
├─ Premium VPN ........................... +15 points
├─ Proxy Network ......................... +25 points
└─ Suspicious network activity ........... Analyzed

Movement Analysis
├─ Impossible velocity ................... +20 points
└─ Non-linear movement ................... Analyzed

Total Risk Score: 0-100%
```

## Error Handling Flow

```
User Action
    │
    ▼
┌─────────────────────────────┐
│ Request Location Permission │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
Granted    Denied
    │          │
    │          └─→ Show Alert
    │              "Permission Required"
    │              └─→ Allow Retry
    │
    ▼
Collect GPS Data
    │
    ├─ Success ──→ Proceed
    │
    └─ Failure ──→ Use Default Coordinates
                  └─→ Show Warning
                      └─→ Allow Re-analysis

    ▼
Send to API
    │
    ├─ Success ──→ Display Results
    │
    └─ Failure ──→ Show Error Alert
                  └─→ Allow Retry
```

## File Structure

```
ridesafe/
├── backend/
│   ├── src/
│   │   ├── fraud/                    ← NEW MODULE
│   │   │   ├── fraud.controller.ts
│   │   │   ├── fraud.service.ts
│   │   │   ├── fraud.module.ts
│   │   │   └── dto/
│   │   │       └── fraud.dto.ts
│   │   ├── app.module.ts             ← MODIFIED
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma             ← MODIFIED
│   └── ...
│
├── src/
│   ├── screens/
│   │   ├── kyc/
│   │   │   ├── KYCFraudDetectionScreen.tsx  ← NEW
│   │   │   ├── KYCPayoutSetupScreen.tsx     ← MODIFIED
│   │   │   └── ...
│   │   └── admin/
│   │       ├── AdminFraudReviewScreen.tsx   ← NEW
│   │       └── ...
│   ├── navigation/
│   │   └── KYCNavigator.tsx          ← MODIFIED
│   ├── services/
│   │   └── api.ts                    ← MODIFIED
│   └── ...
│
├── package.json                      ← MODIFIED
├── FRAUD_DETECTION_INTEGRATION.md    ← NEW
├── FRAUD_SETUP_QUICK_START.md        ← NEW
├── FRAUD_DETECTION_SUMMARY.md        ← NEW
├── INTEGRATION_CHECKLIST.md          ← NEW
└── FRAUD_DETECTION_VISUAL_GUIDE.md   ← NEW (this file)
```

---

This visual guide provides a complete overview of the fraud detection system's user interface, data flow, and integration points.
