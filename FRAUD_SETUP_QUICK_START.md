# Fraud Detection - Quick Start Setup

## Step 1: Install Dependencies

### Frontend
```bash
npm install
```

This will install `expo-location@~17.0.1` which was added to package.json.

### Backend
```bash
cd backend
npm install
```

## Step 2: Database Migration

```bash
cd backend
npm run db:push
```

This creates the `FraudAnalysis` table in your PostgreSQL database.

## Step 3: Verify Backend Integration

The FraudModule has been added to `backend/src/app.module.ts`. Verify it's there:

```typescript
import { FraudModule } from './fraud/fraud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EmailModule,
    AuthModule,
    KycModule,
    FraudModule,  // ← Should be here
  ],
})
export class AppModule {}
```

## Step 4: Verify Frontend Integration

Check that KYCFraudDetectionScreen is in the navigator:

**File: `src/navigation/KYCNavigator.tsx`**
```typescript
import KYCFraudDetectionScreen from '../screens/kyc/KYCFraudDetectionScreen';

// In Stack.Navigator:
<Stack.Screen name="KYCFraudDetection" component={KYCFraudDetectionScreen} />
```

## Step 5: Test the Flow

1. **Start Backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Start Frontend:**
   ```bash
   npm start
   ```

3. **Test KYC Flow:**
   - Login as a driver
   - Complete KYC steps 1-4
   - You should see the Fraud Detection screen (Step 5)
   - Click "Analyze Device" to test the fraud detection API

## Step 6: Test Admin Review (Optional)

The admin fraud review screen is created but not yet integrated into the admin dashboard navigation. To add it:

**File: `src/navigation/AppNavigator.tsx`**

Add to the admin stack:
```typescript
<Stack.Screen 
  name="AdminFraudReview" 
  component={AdminFraudReviewScreen} 
/>
```

Then add a button in `AdminDashboardScreen` to navigate to it.

## API Endpoints Available

Once backend is running, these endpoints are available:

### User Endpoints
- `POST /api/fraud/analyze` - Analyze device for fraud
- `GET /api/fraud/status` - Get fraud analysis status

### Admin Endpoints
- `GET /api/fraud/admin/submissions` - List fraud submissions
- `GET /api/fraud/admin/submission/:userId` - Get submission details
- `PATCH /api/fraud/admin/review/:userId` - Review submission

## Troubleshooting

### "Cannot find module 'expo-location'"
- Run `npm install` in the frontend directory
- Restart the development server

### "FraudModule not found"
- Verify `backend/src/fraud/fraud.module.ts` exists
- Check import in `backend/src/app.module.ts`

### Database migration fails
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run `npm run db:generate` first, then `npm run db:push`

### Location permission denied
- Grant location permission in device settings
- For iOS: Settings → Privacy → Location Services
- For Android: Settings → Apps → Permissions → Location

## Files Created

### Backend
```
backend/src/fraud/
├── fraud.controller.ts
├── fraud.service.ts
├── fraud.module.ts
└── dto/
    └── fraud.dto.ts
```

### Frontend
```
src/screens/
├── kyc/
│   └── KYCFraudDetectionScreen.tsx
└── admin/
    └── AdminFraudReviewScreen.tsx
```

### Documentation
```
FRAUD_DETECTION_INTEGRATION.md
FRAUD_SETUP_QUICK_START.md (this file)
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Run database migration
3. ✅ Start backend and frontend
4. ✅ Test KYC flow with fraud detection
5. ⏳ Integrate admin fraud review screen into dashboard
6. ⏳ Add fraud analytics to admin dashboard
7. ⏳ Configure fraud detection thresholds

## Support

For detailed information, see `FRAUD_DETECTION_INTEGRATION.md`
