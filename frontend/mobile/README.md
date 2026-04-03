# Frontend Production Readiness Audit (Team of 3)

Date: April 3, 2026
Scope: RideSafe-AI frontend mobile app
Goal: Remove mocked, hardcoded, and non-production logic. Ship-ready in 3 parallel tracks.

## Summary
- Estimated mocked or simulated surface: 35-45% of screens and flows
- Production readiness score: 4/10

## Team Split
- Developer 1: Auth, Identity, KYC, Location
- Developer 2: Payments, Plans, Claims
- Developer 3: Admin + Fraud + Live Risk (Mapbox)

## Developer 1 Checklist (Auth, Identity, KYC, Location)

### A. OAuth and Login (Mock Removal)
- Replace mock OAuth flow with real provider exchange.
  - File: [RideSafe-AI/frontend/mobile/src/screens/auth/LoginScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/auth/LoginScreen.tsx#L82)
  - Tasks:
    - Implement provider login (web auth or deep link) and exchange code via backend.
    - Remove mock email/password creation and auto register fallback.
    - Add explicit failure states (cancel, token exchange failure, revoked consent).
  - Done when:
    - OAuth produces backend-issued tokens and real identity, no mock credentials.

### B. Identity Handling (No Email-as-ID, No Hardcoded Provider)
- Stop using email as userId and remove BLINKIT hardcoding.
  - File: [RideSafe-AI/frontend/mobile/src/context/AuthContext.tsx](RideSafe-AI/frontend/mobile/src/context/AuthContext.tsx#L105)
  - File: [RideSafe-AI/frontend/mobile/src/context/AuthContext.tsx](RideSafe-AI/frontend/mobile/src/context/AuthContext.tsx#L55)
  - Tasks:
    - Persist server-provided userId and driverId.
    - Pass provider from actual login context to createDriver.
    - Reject missing driverId for driver-only APIs and force re-auth.
  - Done when:
    - User identity is server-trusted only, provider is real, no email-as-ID fallback.

### C. KYC Fraud Detection (Real Signals)
- Remove default coordinates and static signals.
  - File: [RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx#L82)
  - File: [RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx#L40)
  - Tasks:
    - Block analysis if permission denied or location is unavailable.
    - Replace static SIGNALS list with backend response.
    - Do not allow Bangalore fallback; show error and retry CTA.
  - Done when:
    - Fraud analysis never runs with dummy coordinates or static signal list.

### D. Location Integrity (No Mock Location in Prod)
- Remove mock fallback for location failures.
  - File: [RideSafe-AI/frontend/mobile/src/context/LocationContext.tsx](RideSafe-AI/frontend/mobile/src/context/LocationContext.tsx#L18)
  - Tasks:
    - If ExpoLocation missing or permission denied, show blocking error state.
    - Gate risk pipelines when location is invalid.
    - Emit telemetry for location failure cases.
  - Done when:
    - No silent mock GPS in production paths.

### E. Notification and Help UI (Fake Alerts)
- Replace alert-only notifications and static support flows.
  - File: [RideSafe-AI/frontend/mobile/src/components/AdminShell.tsx](RideSafe-AI/frontend/mobile/src/components/AdminShell.tsx#L34)
  - File: [RideSafe-AI/frontend/mobile/src/screens/auth/LoginScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/auth/LoginScreen.tsx#L76)
  - Tasks:
    - Connect notifications to backend feed or remove button until ready.
    - Remove static "No new alerts" alerts that imply real data.
  - Done when:
    - Notification actions show real data or are hidden behind a feature flag.

### F. Static Support and Legal Content
- Move static support/legal strings to backend or config service.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverProfileScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverProfileScreen.tsx#L171)
  - Tasks:
    - Load support contacts, app version, legal text from API or remote config.
    - Add fallback for offline with clear "cached" indicator.
  - Done when:
    - Support/legal content is configurable and not hardcoded in UI.

## Developer 2 Checklist (Payments, Plans, Claims)

### A. Razorpay Checkout (Production Integrity)
- Remove test checkout and stop local policy injection.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx#L134)
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx#L334)
  - Tasks:
    - Remove test labels and test VPA.
    - Do not create local policy before server verification.
    - On verify failure, show error and keep state unchanged.
  - Done when:
    - Policy appears only after verified backend response.

### B. Local Fallback Removal (Purchased Plans)
- Remove local policy as source of truth.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverPlansScreen.tsx#L24)
  - Tasks:
    - Keep local storage as read-only cache at most.
    - Ensure purchased list comes from backend only.
  - Done when:
    - Purchased plans are server-sourced only.

### C. Claims Trigger (No Hardcoded Event/Amount)
- Replace hardcoded claim trigger with real flow.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/ClaimsScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/ClaimsScreen.tsx#L41)
  - Tasks:
    - Replace hardcoded claimAmount and eventType with user input or server-driven claim.
    - Add validation and error handling.
  - Done when:
    - New claim flow uses dynamic data only.

### D. Plans Data Integrity
- Enforce schema validation and error display.
  - File: [RideSafe-AI/frontend/mobile/src/services/api.ts](RideSafe-AI/frontend/mobile/src/services/api.ts#L469)
  - Tasks:
    - Validate response shapes for plans and payouts.
    - Show explicit error UI if response is incomplete.
  - Done when:
    - No silent default UI for missing backend data.

### E. Policy and Claims UI (Simulated Copy)
- Remove hardcoded copy that implies actions succeeded when they did not.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/PolicyScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/PolicyScreen.tsx#L118)
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/ClaimsScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/ClaimsScreen.tsx#L78)
  - Tasks:
    - Replace any delayed or simulated success with server-verified status.
    - Ensure claim status and policy state come from backend only.
  - Done when:
    - UI success messages are triggered only by verified backend responses.

## Developer 3 Checklist (Admin + Fraud + Live Risk)

### A. Admin Fraud Detail and Report
- Replace mocked admin fraud data with real API integration.
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudDetailScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudDetailScreen.tsx#L33)
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx#L30)
  - Tasks:
    - Use fraudApi.getSubmissionDetails to fetch detail.
    - Use fraudApi.reviewSubmission for approve/reject.
    - Replace static signals list with backend signal payload.
  - Done when:
    - Admin fraud screens render with live backend data only.

### B. Admin Actions (Export, Share, Escalate)
- Implement or remove all non-functional CTAs.
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx#L92)
  - Tasks:
    - Implement Export PDF (backend endpoint).
    - Implement Share and Escalate actions or remove UI until ready.
  - Done when:
    - All admin CTAs have real effects or are removed.

### C. Live Risk Mapbox (No Risk Mock)
- Remove mock risk generation in WebView.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverLiveRiskMapboxScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverLiveRiskMapboxScreen.tsx#L193)
  - Tasks:
    - Generate risk map from backend risk API.
    - Inject risk map into WebView.
    - Display explicit empty state when data is missing.
  - Done when:
    - No riskMockForH3 exists in production path.

### D. Admin Setup Screen (Stub Actions)
- Replace onPress stubs with backend config calls.
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminSetupScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminSetupScreen.tsx#L53)
  - Tasks:
    - Wire each setup item to real API or remove item.
  - Done when:
    - Setup screen is functional or hidden behind feature flag.

### E. Admin Mock Dataset Removal
- Remove or gate admin mock dataset.
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/adminMockData.ts](RideSafe-AI/frontend/mobile/src/screens/admin/adminMockData.ts#L61)
  - Tasks:
    - Delete mock data file or guard usage behind __DEV__.
    - Ensure admin screens never import mock data in production builds.
  - Done when:
    - No admin screen can render mock data in production.

### F. Admin Dashboard Placeholder
- Replace risk chart placeholder with real analytics data.
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminDashboardScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminDashboardScreen.tsx#L102)
  - Tasks:
    - Replace placeholder card with real chart component and API data.
    - Handle empty state when analytics are not yet computed.
  - Done when:
    - Dashboard shows real risk distribution or explicit empty state.

## Cross-Cutting Checklist (All Developers)

### A. Environment and Secrets
- Remove committed secrets and local URLs from runtime config.
  - File: [RideSafe-AI/frontend/mobile/.env](RideSafe-AI/frontend/mobile/.env#L4)
  - Tasks:
    - Move secrets to secure environment management.
    - Remove localhost fallbacks for production builds.
  - Done when:
    - No secrets committed; prod config is env-driven only.

### B. Error Handling and Observability
- Ensure all critical API calls have explicit failure UI and logging.
  - Tasks:
    - Remove silent fallbacks that show fake data.
    - Add telemetry on failed calls.
  - Done when:
    - Any backend failure is visible and traceable.

### C. Feature Flag Discipline
- All remaining placeholders must be behind __DEV__ or a runtime feature flag.
  - Done when:
    - No placeholder is reachable in production builds.

### D. Hardcoded Timestamps and "Just Now" Strings
- Replace static timestamps with real data.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverRiskPipelineScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverRiskPipelineScreen.tsx#L137)
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/DriverRiskPipelineScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/DriverRiskPipelineScreen.tsx#L169)
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/HomeScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/HomeScreen.tsx#L90)
  - Tasks:
    - Bind timestamps to backend or telemetry clock.
    - Remove static copy like "Updated just now" unless derived from data.
  - Done when:
    - All time labels reflect actual data timestamps.

### E. Simulated UI Actions
- Replace UI-only alerts with real integrations.
  - File: [RideSafe-AI/frontend/mobile/src/screens/main/HomeScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/main/HomeScreen.tsx#L116)
  - Tasks:
    - Replace "Call Lead" alert with a real tel: link or backend-driven call flow.
  - Done when:
    - UI actions perform real side effects or are removed.

### F. Static Remote Images and Placeholder Maps
- Replace static image URLs used as placeholders for maps or avatars.
  - File: [RideSafe-AI/frontend/mobile/src/components/MainTopNavbar.tsx](RideSafe-AI/frontend/mobile/src/components/MainTopNavbar.tsx#L19)
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudDetailScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudDetailScreen.tsx#L143)
  - File: [RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/admin/AdminFraudReportScreen.tsx#L139)
  - File: [RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx](RideSafe-AI/frontend/mobile/src/screens/kyc/KYCFraudDetectionScreen.tsx#L147)
  - Tasks:
    - Replace static map images with real map components or backend-rendered tiles.
    - Replace static avatar URLs with user profile images or initial-based fallback.
  - Done when:
    - No hardcoded external image URLs remain in production UI.

## Acceptance Criteria (Global)
- No mocked data in production screens.
- All CTAs have real side effects or are removed.
- All user identities and payments are server-verified.
- All risk data displayed is sourced from backend telemetry.
