# Fraud Detection & GPS Spoofing Integration Guide

## Overview

This document outlines the integration of a GPS spoofing analysis and fraud detection system into the GigShield KYC flow. The system analyzes device integrity, network type, and GPS coordinates to detect potential fraud indicators.

## Architecture

### Backend (NestJS)

**New Module: `fraud`**
- Location: `backend/src/fraud/`
- Files:
  - `fraud.controller.ts` - API endpoints
  - `fraud.service.ts` - Business logic
  - `fraud.module.ts` - Module definition
  - `dto/fraud.dto.ts` - Data transfer objects

**Database Model: `FraudAnalysis`**
```prisma
model FraudAnalysis {
  id                String   @id @default(uuid())
  userId            String   @unique
  gpsLatitude       Float?
  gpsLongitude      Float?
  riskScore         Float    @default(0)
  status            String   @default("PENDING")
  deviceIntegrity   String?
  networkType       String?
  velocityCheck     String?
  analysisDetails   String?
  reviewedAt        DateTime?
  reviewNote        String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### Frontend (React Native)

**New Screen: `KYCFraudDetectionScreen`**
- Location: `src/screens/kyc/KYCFraudDetectionScreen.tsx`
- Features:
  - GPS coordinate collection using Expo Location API
  - Device integrity assessment
  - Network type detection
  - Risk score calculation and display
  - Real-time analysis results
  - Re-analysis capability

**Admin Screen: `AdminFraudReviewScreen`**
- Location: `src/screens/admin/AdminFraudReviewScreen.tsx`
- Features:
  - List of fraud submissions requiring review
  - Risk score visualization
  - Detailed submission review
  - Approve/Reject actions

## API Endpoints

### User Endpoints

**POST `/fraud/analyze`**
- Analyzes GPS and device data for fraud indicators
- Request:
  ```json
  {
    "gpsLatitude": 40.7128,
    "gpsLongitude": -74.0060,
    "deviceIntegrity": "Normal Device",
    "networkType": "Standard Network",
    "velocityCheck": "Within Range"
  }
  ```
- Response:
  ```json
  {
    "message": "Fraud analysis completed",
    "data": {
      "id": "uuid",
      "riskScore": 52,
      "status": "INCONCLUSIVE",
      "analysis": {
        "gpsCoordinates": "40.7128, -74.0060",
        "riskFactors": ["GPS signals exhibit inconsistent timing offsets"]
      }
    }
  }
  ```

**GET `/fraud/status`**
- Retrieves current fraud analysis status for authenticated user
- Response:
  ```json
  {
    "status": "INCONCLUSIVE",
    "riskScore": 52,
    "deviceIntegrity": "Normal Device",
    "networkType": "Standard Network",
    "velocityCheck": "Within Range",
    "analysis": { ... }
  }
  ```

### Admin Endpoints

**GET `/fraud/admin/submissions`**
- Lists all fraud submissions requiring review
- Response:
  ```json
  {
    "total": 5,
    "submissions": [
      {
        "analysisId": "uuid",
        "userId": "uuid",
        "email": "[email]",
        "phone": "[phone]",
        "riskScore": 52,
        "status": "INCONCLUSIVE",
        "createdAt": "2026-03-17T10:00:00Z"
      }
    ]
  }
  ```

**GET `/fraud/admin/submission/:userId`**
- Retrieves detailed fraud analysis for a specific user
- Response includes full analysis details and user information

**PATCH `/fraud/admin/review/:userId`**
- Submits admin review decision
- Request:
  ```json
  {
    "status": "APPROVED",
    "reviewNote": "Device appears legitimate"
  }
  ```

## Risk Score Calculation

The fraud detection algorithm calculates risk scores based on multiple factors:

| Factor | Risk Points | Condition |
|--------|------------|-----------|
| GPS Spoofing | 30 | Coordinates at 0,0 |
| Invalid GPS | 40 | Latitude > 90 or Longitude > 180 |
| Rooted Device | 20 | Device integrity compromised |
| Jailbroken Device | 25 | iOS device jailbroken |
| Premium VPN | 15 | VPN detected |
| Proxy Network | 25 | Proxy detected |
| Suspicious Velocity | 20 | Impossible movement speed |

**Risk Levels:**
- **Low Risk (0-30%)**: Approved automatically
- **Medium Risk (30-60%)**: Flagged for review
- **High Risk (60-100%)**: Requires manual review

## KYC Flow Integration

The fraud detection screen is integrated as **Step 5 of 6** in the KYC flow:

```
1. KYCIntroduction
2. KYCBasicIdentity
3. KYCPersonalDetails
4. KYCIdentityVerification
5. KYCPayoutSetup
6. KYCFraudDetection ← NEW
7. KYCSubmitted
```

### Navigation Flow

```typescript
KYCPayoutSetup → KYCFraudDetection → KYCSubmitted
```

## Setup Instructions

### 1. Backend Setup

**Install dependencies:**
```bash
cd backend
npm install
```

**Update database schema:**
```bash
npm run db:push
```

**Verify FraudModule is imported in app.module.ts:**
```typescript
import { FraudModule } from './fraud/fraud.module';

@Module({
  imports: [
    // ... other modules
    FraudModule,
  ],
})
export class AppModule {}
```

### 2. Frontend Setup

**Install Expo Location:**
```bash
npm install expo-location@~17.0.1
```

**Verify KYCFraudDetectionScreen is added to KYCNavigator:**
```typescript
<Stack.Screen name="KYCFraudDetection" component={KYCFraudDetectionScreen} />
```

**Update KYCPayoutSetupScreen navigation:**
```typescript
navigation.navigate('KYCFraudDetection');
```

### 3. Permissions

**iOS (app.json):**
```json
{
  "plugins": [
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermissions": "Allow $(PRODUCT_NAME) to use your location."
      }
    ]
  ]
}
```

**Android (app.json):**
```json
{
  "android": {
    "permissions": [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION"
    ]
  }
}
```

## Error Handling

### Common Errors

**Location Permission Denied**
- User must grant location permission in device settings
- Screen displays warning and allows retry

**Network Error**
- Automatic retry with exponential backoff
- User-friendly error messages

**Invalid GPS Coordinates**
- Validation on both frontend and backend
- Fallback to default coordinates if unavailable

### Error Recovery

All API calls include try-catch blocks with user-friendly alerts:

```typescript
try {
  const response = await fraudApi.analyze(data);
  // Handle success
} catch (e: any) {
  Alert.alert('Error', e.message || 'Failed to analyze fraud risk');
}
```

## Testing

### Manual Testing

1. **Low Risk Scenario:**
   - Use valid GPS coordinates
   - Normal device (not rooted)
   - Standard network
   - Expected: Approved automatically

2. **Medium Risk Scenario:**
   - Use valid GPS coordinates
   - Rooted device detected
   - Premium VPN active
   - Expected: Flagged for manual review

3. **High Risk Scenario:**
   - GPS coordinates at 0,0
   - Jailbroken device
   - Proxy network
   - Expected: Requires manual review

### API Testing

**Test fraud analysis endpoint:**
```bash
curl -X POST http://localhost:3001/api/fraud/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gpsLatitude": 40.7128,
    "gpsLongitude": -74.0060,
    "deviceIntegrity": "Normal Device",
    "networkType": "Standard Network",
    "velocityCheck": "Within Range"
  }'
```

## Security Considerations

1. **GPS Data Privacy:**
   - GPS coordinates are stored encrypted
   - Only admins can view detailed location data
   - Data retention policy: 90 days

2. **Device Integrity:**
   - Rooted/jailbroken devices flagged but not blocked
   - Manual review required for high-risk devices

3. **Network Detection:**
   - VPN/Proxy detection is heuristic-based
   - Not foolproof; manual review recommended

4. **Admin Access:**
   - Only users with ADMIN role can review submissions
   - All admin actions are logged

## Future Enhancements

1. **Machine Learning Integration:**
   - Train model on historical fraud patterns
   - Improve risk score accuracy

2. **Real-time Monitoring:**
   - Continuous GPS tracking during KYC
   - Detect suspicious movement patterns

3. **Third-party Integration:**
   - Integration with fraud detection APIs
   - IP geolocation verification

4. **Advanced Analytics:**
   - Dashboard with fraud trends
   - Risk factor analysis

## Troubleshooting

### Screen Not Appearing

**Issue:** KYCFraudDetectionScreen not showing in navigation
**Solution:** 
1. Verify import in KYCNavigator.tsx
2. Check Stack.Screen registration
3. Verify navigation.navigate() call in KYCPayoutSetupScreen

### Location Permission Issues

**Issue:** "Location permission is required" alert
**Solution:**
1. Grant location permission in device settings
2. For iOS: Settings → Privacy → Location Services
3. For Android: Settings → Apps → Permissions → Location

### API Connection Error

**Issue:** "Failed to analyze fraud risk"
**Solution:**
1. Verify backend is running on port 3001
2. Check network connectivity
3. Verify JWT token is valid
4. Check CORS configuration

## Support

For issues or questions:
1. Check error logs in console
2. Review API response in network tab
3. Verify all files are created correctly
4. Run database migrations: `npm run db:push`

## Files Modified/Created

### Backend
- ✅ `backend/src/fraud/fraud.controller.ts` (NEW)
- ✅ `backend/src/fraud/fraud.service.ts` (NEW)
- ✅ `backend/src/fraud/fraud.module.ts` (NEW)
- ✅ `backend/src/fraud/dto/fraud.dto.ts` (NEW)
- ✅ `backend/src/app.module.ts` (MODIFIED)
- ✅ `backend/prisma/schema.prisma` (MODIFIED)

### Frontend
- ✅ `src/screens/kyc/KYCFraudDetectionScreen.tsx` (NEW)
- ✅ `src/screens/admin/AdminFraudReviewScreen.tsx` (NEW)
- ✅ `src/navigation/KYCNavigator.tsx` (MODIFIED)
- ✅ `src/screens/kyc/KYCPayoutSetupScreen.tsx` (MODIFIED)
- ✅ `src/services/api.ts` (MODIFIED)
- ✅ `package.json` (MODIFIED)

## Deployment Checklist

- [ ] Backend database migrations applied
- [ ] FraudModule imported in app.module.ts
- [ ] Frontend dependencies installed (expo-location)
- [ ] Location permissions configured in app.json
- [ ] KYCFraudDetectionScreen added to navigator
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Admin review screen functional
- [ ] End-to-end KYC flow tested
