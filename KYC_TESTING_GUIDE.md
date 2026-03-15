# RideSafe KYC End-to-End Testing Guide

## System Status ✅
- **Backend**: Running on port 3001 (NestJS)
- **Frontend**: Running on Expo (React Native)
- **Database**: PostgreSQL configured with Prisma
- **Authentication**: JWT-based with MFA (OTP)

---

## Test Scenario: Complete KYC Flow

### 1. REGISTRATION TEST

**Steps:**
1. Open the app on simulator/device
2. On LoginScreen, look for a "Don't have account?" link or button
3. Click to open registration
4. Enter:
   - Email: `testdriver@example.com`
   - Password: `TestPass@123`
   - Phone (optional): `9876543210`
5. Click Register
6. You should see a message: "Registration successful! Check your email for OTP"

**Expected Backend Response:**
```
POST /api/auth/register
Status: 201 Created
```

---

### 2. OTP VERIFICATION TEST

**Steps:**
1. After registration, you'll be redirected to OTP verification screen
2. Since we're using mock email (not real SMTP in dev), check backend console or database
   - For dev/testing: Use OTP `123456` (default test OTP)
   - Or check the email service logs
3. Enter OTP in the app
4. Click "Verify"

**Expected Response:**
```
POST /api/auth/verify-otp
Status: 200 OK
Response: { accessToken, refreshToken, message: "..." }
```

**What Happens Next:**
- Token saved to AsyncStorage
- AuthContext sets user = { email, role: 'DRIVER' }
- AppNavigator detects KYC is NOT_STARTED
- You're redirected to KYCNavigator flow
- Should see KYCIntroductionScreen

---

### 3. STEP 1: BASIC IDENTITY TEST

**Screen:** KYCBasicIdentityScreen

**Enter Data:**
- Full Name: `John Doe`
- Date of Birth: `01/01/1990`
- Gender: Select "Male" (tap button)

**Expected Behavior:**
- Continue button is disabled until all fields filled
- 25% progress bar shown
- No loading indicator initially

**Submit:**
1. Click "Continue"
2. Loading indicator appears
3. Backend call: `POST /api/kyc/basic-identity`
4. `refreshKycStatus()` is called
5. Navigation to KYCPersonalDetailsScreen

**Success Indicators:**
- No error alert
- Progress updated
- Smooth navigation

---

### 4. STEP 2: PERSONAL DETAILS TEST

**Screen:** KYCPersonalDetailsScreen

**Enter Data:**
- Address: `123 Main Street, Apartment 4B`
- City: `New Delhi`
- State: `Delhi`
- Pincode: `110001`

**Expected Behavior:**
- 50% progress bar
- State and Pincode in half-width layout
- Continue button enabled when all filled

**Submit:**
1. Click "Continue"
2. Backend call: `POST /api/kyc/personal-details`
3. Navigate to KYCIdentityVerificationScreen

---

### 5. STEP 3: IDENTITY VERIFICATION TEST

**Screen:** KYCIdentityVerificationScreen

**Enter Data:**
- Aadhaar Number: `123456789012` (exactly 12 digits)
- PAN Number: `ABCDE1234F` (exactly 10 characters)

**Validation Tests:**

*Test 5a - Invalid Aadhaar (too short):*
- Enter: `12345678901` (11 digits)
- Click Continue
- Alert: "Aadhaar must be 12 digits"

*Test 5b - Invalid PAN (too short):*
- Clear and enter: `ABCDE1234`
- Alert: "PAN must be 10 characters"

*Test 5c - Valid submission:*
- Aadhaar: `123456789012`
- PAN: `ABCDE1234F`
- Click Continue
- Backend: `POST /api/kyc/identity-verification`
- 75% progress shown
- Security notice displays: "Encrypted and stored securely"

---

### 6. STEP 4: PAYOUT SETUP TEST

**Screen:** KYCPayoutSetupScreen

**Test 6a - UPI Method:**
1. Click "UPI" tab
2. Enter UPI ID: `johndoe@googlepay`
3. Helper text shown: "Find it in your GPay..."
4. Continue button enabled
5. Click Continue
6. Backend: `POST /api/kyc/payout-setup` with `{ method: 'UPI', upiId: '...' }`
7. 100% progress shown

**Test 6b - Bank Method (if retry):**
1. Go back, click "BANK" tab
2. Enter:
   - Account Holder: `John Doe`
   - Account Number: `9876543210123456`
   - IFSC Code: `SBIN0001234`
3. Continue
4. Backend: `POST /api/kyc/payout-setup` with bank details

---

### 7. STEP 5: SUBMISSION TEST

**Screen:** KYCSubmittedScreen

**Expected Immediate Behavior:**
1. Show loading indicator: "Submitting your details..."
2. Backend automatically called: `POST /api/kyc/submit`
3. No validation errors expected (all steps completed)

**Backend Response Expected:**
```
HTTP 200 OK
{
  "message": "KYC submitted successfully! Our team will review...",
  "profile": { "status": "SUBMITTED", "submittedAt": "...", ... }
}
```

**After Submission:**
1. Loading disappears
2. Success screen shown with checkmark icon
3. Message: "All Done! We have received your KYC submission."
4. Checklist of completed items shown:
   - ✓ Basic Identity Information
   - ✓ Personal Address Details
   - ✓ Identity Verification (Aadhaar & PAN)
   - ✓ Payout Method Setup
5. "Go to Dashboard" button visible

---

### 8. DASHBOARD ACCESS TEST

**Expected Behavior:**
1. Click "Go to Dashboard"
2. Navigation: `navigation.replace('Home')` - shows MainTabNavigator
3. Dashboard screens appear:
   - Home
   - Claims
   - Risk
   - Wallet
   - Policy

**Verify:**
- Bottom tab navigation working
- User icon/profile info visible
- Dashboard content loads

---

### 9. APP RESTART SESSION TEST

**Purpose:** Verify KYC status persists after app restart

**Steps:**
1. Close app completely
2. Reopen app
3. Expected Flow:
   - AppNavigator shows loading indicator
   - AuthContext restores token from AsyncStorage
   - `checkKycStatus()` called
   - Backend: `GET /api/kyc/status` returns `{ status: 'SUBMITTED', ... }`
   - kycStatus set to 'SUBMITTED'
   - MainTabNavigator shows (dashboard)
   - User remains logged in

**Verify:**
- No need to log in again
- Dashboard immediately visible
- KYC status persisted

---

## Error Scenarios to Test

### Error 1: Incomplete KYC Submission
1. Navigate to KYCPayoutSetupScreen (step 4)
2. Don't fill in data
3. Try to submit
4. Alert: "Please enter your UPI ID" (or bank details)
5. Backend should NOT be called

### Error 2: Backend Offline
1. Stop backend server (kill terminal)
2. Try to continue from any KYC step
3. Expected: Alert with error message
4. Button remains enabled for retry

### Error 3: Network Error Recovery
1. After network error, user can click Continue again
2. Backend call retried
3. Flow continues on success

### Error 4: Invalid Token
1. Clear AsyncStorage manually (via developer tools)
2. Try to access KYC flow
3. Should redirect to login

---

## Performance Checks

- [ ] Each KYC step loads in < 2 seconds
- [ ] Loading indicators appear during API calls
- [ ] No network waterfall (sequential calls, not parallel)
- [ ] Progress bar smooth animation
- [ ] Navigation smooth transitions

---

## Database Verification

After completing KYC flow, verify database entries:

```sql
-- Check User created
SELECT * FROM "User" WHERE email = 'testdriver@example.com';

-- Check KYC Profile status
SELECT * FROM "KYCProfile" WHERE "userId" = '<user_id>';

-- Verify all 4 KYC steps saved
SELECT * FROM "KYCBasicIdentity" WHERE "userId" = '<user_id>';
SELECT * FROM "KYCPersonalDetails" WHERE "userId" = '<user_id>';
SELECT * FROM "KYCIdentityVerification" WHERE "userId" = '<user_id>';
SELECT * FROM "KYCPayoutSetup" WHERE "userId" = '<user_id>';

-- Should show: status='SUBMITTED', submittedAt=<timestamp>
```

---

## Admin Flow Test (Optional)

1. On LoginScreen, click "Admin Login"
2. Enter admin credentials (from backend seed):
   - Email: `admin@ridesafe.com`
   - Password: `AdminPass@123`
3. Should send OTP to admin email
4. After OTP verification: see AdminDashboard
5. Should list KYC submissions for review

---

## Success Criteria ✅

- [ ] User registers successfully
- [ ] OTP verification works
- [ ] All 4 KYC steps complete with backend persistence
- [ ] KYC submission succeeds
- [ ] Dashboard accessible after KYC
- [ ] App restart maintains KYC status
- [ ] No console errors during flow
- [ ] All API responses return HTTP 200
- [ ] No loading hangs or freezes

---

## Logs to Monitor

**Backend Console:**
```
[Nest] 12345 - 11/15/2024 10:30:45 AM   log [NestFactory] Application initialized in 1234ms
[HTTP] POST /api/kyc/basic-identity 200 1234ms
[HTTP] POST /api/kyc/personal-details 200 1456ms
```

**Frontend Console (Expo):**
```
INFO: KYC status checked: { status: 'IN_PROGRESS', ... }
INFO: Basic identity saved, refreshing status
INFO: KYC status refreshed: IN_PROGRESS
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not responding | Check port 3001, restart npm start |
| OTP not received | Check backend @ app-module.ts or use test OTP |
| KYC data not saving | Check network tab for failed requests, verify JWT token |
| Navigation stuck | Check console for errors, verify AppNavigator logic |
| AsyncStorage empty | Clear app data and restart |

