# RideSafe-AI (Aegis) - Comprehensive Project Analysis

## Executive Summary

**RideSafe-AI (Aegis)** is an **AI-Powered Parametric Income Insurance Platform** designed for India's gig delivery workers (Zepto, Blinkit, Swiggy Instamart riders). Rather than traditional claim-based insurance, it uses parametric triggers—when a delivery zone becomes **unserviceable** (not on bad weather alone), automatic payouts fire immediately without claim forms or waiting.

---

## 1. PROJECT PURPOSE

### Core Problem Statement
- **Rain isn't the issue**: Gig riders earn surge bonuses during rain
- **Real problem**: Zone unserviceability—when platforms halt dispatch due to extreme conditions (flooding, civic shutdowns, safety alerts)
- **Impact**: Immediate income loss with no platform compensation

### Solution
**Parametric Insurance** that:
- Triggers automatically when zones become HALTED (external, verifiable threshold)
- Sends instant payouts to rider accounts
- Normalizes earnings baseline per platform (daily vs. weekly payout cycles)
- Eliminates claim filing and waiting periods

### Target Users
| Platform | Earnings/Week | Payout Cycle | Role |
|----------|--------------|--------------|------|
| Zepto | ₹5,000–₹6,000 | Weekly | Active Riders (24/7) |
| Blinkit | ₹5,500–₹6,500 | Weekly | Active Riders (24/7) |
| Swiggy Instamart | ₹4,500–₹8,000 | Daily/Weekly | Active Riders (24/7) |

---

## 2. TECH STACK

### Backend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js + NestJS | 10.3.5 | REST API Framework |
| **Database** | PostgreSQL 14 | - | Primary data store |
| **ORM** | Prisma | 5.10.2 | Type-safe DB access |
| **Authentication** | JWT + Passport | 10.0.3 | Auth/Authorization |
| **Email** | Nodemailer | 6.9.13 | Email notifications |
| **Payments** | Razorpay SDK | 2.9.6 | Payment processing |
| **Security** | Bcrypt | 5.1.1 | Password hashing |
| **Validation** | class-validator | 0.14.1 | DTO validation |
| **Config** | dotenv (@nestjs/config) | 4.0.3 | Environment management |
| **Language** | TypeScript | 5.4.3 | Typed development |

### Frontend (Mobile)
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React Native | 0.81.5 | Cross-platform mobile |
| **Bundler** | Expo | ~54.0.33 | Development & deployment |
| **Navigation** | Expo Router | ~6.0.23 | File-based routing |
| **UI Components** | React Native + SVG | 15.12.1 | UI rendering |
| **State Management** | React Context API | - | App state |
| **Location** | Expo Location | ~19.0.8 | GPS tracking |
| **Storage** | AsyncStorage | 2.2.0 | Local persistence |
| **Fonts** | Expo Font | ~14.0.11 | Custom typography |
| **Language** | TypeScript | ~5.9.2 | Typed mobile code |

### ML/Microservices (Python Stack)
| Service | Port | Framework | Key Dependencies |
|---------|------|-----------|------------------|
| **ML Microservice** | 8000 | FastAPI + Celery | Scikit-learn, Pandas, NumPy, Redis |
| **Grid Event Service** | 8001 | FastAPI | H3, APScheduler, Redis |
| **Pricing Engine** | 8003 | FastAPI | Scikit-learn, Celery, Pandas |

**ML Specific Libraries:**
- `scikit-learn` (1.4.0): Random Forest & Isolation Forest models
- `pandas` (2.2.0): Data processing
- `numpy` (1.26.0): Numerical arrays
- `h3` (4.1.0): Hexagonal spatial indexing (Uber H3)
- `celery` (5.4.0): Async task queue
- `redis` (5.0.4): Caching & message broker
- `psycopg2-binary`: PostgreSQL adapter
- `sqlalchemy` (2.0.30): SQL toolkit
- `joblib`: Model serialization

### Infrastructure
- **Containerization**: Docker (ML microservice)
- **Orchestration**: docker-compose
- **Database**: PostgreSQL 14 (dedicated for ML)
- **Cache**: Redis
- **Task Queue**: Celery with Beat scheduler

---

## 3. ARCHITECTURE

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MOBILE FRONTEND                             │
│                      (React Native + Expo)                           │
│  [Auth Screen] → [KYC Screens] → [Policy Screens] → [Dashboard]     │
└────────────────┬─────────────────────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│               BACKEND API LAYER (NestJS on Node.js)                  │
│                      Port 3001 (0.0.0.0)                             │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┐   │
│  │ Auth Module  │ KYC Module   │ Fraud Module │ Payments Module │   │
│  │ (Auth Guard) │ (Multi-step) │ (Analysis)   │ (Razorpay)      │   │
│  └──────────────┴──────────────┴──────────────┴─────────────────┘   │
│  ┌──────────────┬──────────────────────────────────────────────┐    │
│  │ Plans Module │            Email Module                      │    │
│  │ (Weekly      │ (Nodemailer - Gmail SMTP)                    │    │
│  │  Plans DB)   │                                               │    │
│  └──────────────┴──────────────────────────────────────────────┘    │
└────┬──────────────────────────────┬──────────────────────────────────┘
     │ PostgreSQL Query             │ Redis Connection
     ▼                              ▼
┌──────────────────────────┐   ┌──────────────────┐
│   PostgreSQL Database    │   │   Redis Cache    │
│  (Primary Data Store)    │   │  (Session/Cache) │
│  - Users & KYC           │   │                  │
│  - Policies & Payouts    │   │                  │
│  - Disruption Events     │   │                  │
└──────────────────────────┘   └──────────────────┘

         ML MICROSERVICES (Python Stack)
     ┌─────────────────────────────────────┐
     │ ML Microservice (Port 8000)         │
     │ - Risk Prediction                   │
     │ - Fraud Detection                   │
     │ - Premium Calculation               │
     │ ├─ FastAPI → Inference Engine       │
     │ └─ Celery Workers → Background Jobs │
     └────────────┬────────────────────────┘
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌──────────┐ ┌─────────┐ ┌────────────┐
│  Redis   │ │PgSQL    │ │ External   │
│  (Broker)│ │(Models) │ │ APIs       │
└──────────┘ └─────────┘ └────────────┘

Grid Event Service (Port 8001) | Pricing Engine (Port 8003)
(Disruption Detection)           (Premium Calculation)
```

### Key Architectural Patterns

1. **Monolithic Backend**: All user-facing features in single NestJS application
2. **Microservices for ML**: Separate Python services for compute-heavy ML operations
3. **JWT Authentication**: Stateless token-based auth with refresh tokens
4. **Async Processing**: Celery + Redis for background tasks in ML services
5. **Data Isolation**: Separate PostgreSQL instances for business logic vs. ML models
6. **Real-time Updates**: 10-minute scheduler loops via Celery Beat for environmental data

---

## 4. KEY MODULES

### Backend Services (NestJS)

#### **Auth Module** (`/backend/src/auth/`)
**Responsibility**: User authentication and authorization

**Endpoints:**
- `POST /api/auth/register` - User registration with email/phone
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout and invalidate token
- `POST /api/auth/forgot-password` - Password recovery flow
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/admin/verify-otp` - Admin OTP verification
- `POST /api/auth/seed/create-admin` - Seed admin user (development)

**Key Features:**
- JWT with access (20m) & refresh (7d) tokens
- OTP-based verification
- Password hashing with Bcrypt
- Admin role support
- Passport.js integration

---

#### **KYC Module** (`/backend/src/kyc/`)
**Responsibility**: Know-Your-Customer verification workflow

**Multi-step KYC Process:**
1. Basic Identity (Name, DOB, Gender)
2. Personal Details (Address, City, State, Pincode)
3. Identity Verification (Aadhaar, PAN)
4. Payout Setup (UPI or Bank account)

**Endpoints:**
- `GET /api/kyc/status` - Get KYC completion status
- `POST /api/kyc/basic-identity` - Submit basic info
- `POST /api/kyc/personal-details` - Submit address info
- `POST /api/kyc/identity-verification` - Upload Aadhaar/PAN
- `POST /api/kyc/payout-setup` - Configure payout method
- `POST /api/kyc/submit` - Submit complete KYC
- `GET /api/kyc/admin/submissions` - [ADMIN] View pending submissions
- `GET /api/kyc/admin/submission/:userId` - [ADMIN] View user submission
- `PATCH /api/kyc/admin/review/:userId` - [ADMIN] Approve/Reject submission

**KYC Status Flow:**
`NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `APPROVED` / `REJECTED`

---

#### **Fraud Module** (`/backend/src/fraud/`)
**Responsibility**: Fraud detection and risk analysis

**Endpoints:**
- `POST /api/fraud/analyze` - Analyze user for fraud risk
- `GET /api/fraud/status` - Get fraud analysis status
- `GET /api/fraud/admin/submissions` - [ADMIN] View all analyses
- `GET /api/fraud/admin/submission/:userId` - [ADMIN] View user analysis
- `PATCH /api/fraud/admin/review/:userId` - [ADMIN] Manual review

**Fraud Analysis Fields:**
- GPS coordinates (latitude/longitude)
- Risk score (0-100)
- Device integrity checks
- Network type detection
- Velocity checks (device movement)
- Analysis details (JSON)

---

#### **Payments Module** (`/backend/src/payments/`)
**Responsibility**: Payment processing via Razorpay

**Endpoints:**
- `POST /api/payments/create-order` - Create Razorpay order for policy
- `POST /api/payments/verify` - Verify payment signature

**Features:**
- Razorpay integration for INR payments
- Order creation with amount tied to weekly plans
- Signature verification for payment security
- Order status tracking (CREATED, SUCCESS, FAILED)

---

#### **Plans Module** (`/backend/src/plans/`)
**Responsibility**: Insurance plan management

**Endpoints:**
- `GET /api/plans/weekly` - Fetch all available weekly plans
- `GET /api/plans/me/purchased` - Get user's purchased policies

**Weekly Plans Structure:**
- Unique key identifier
- Price (INR)
- Max payout limit
- Duration (days, default 7)
- Eligible disruption types

---

#### **Email Module** (`/backend/src/email/`)
**Responsibility**: Email notifications

**Features:**
- Nodemailer SMTP integration (Gmail)
- OTP sending
- KYC status notifications
- Payout confirmations
- Policy purchase receipts

---

#### **Prisma Module** (`/backend/src/prisma/`)
**Responsibility**: Database connection management

- Singleton Prisma client
- Connection pooling
- Transaction support

---

### Frontend (React Native)

#### **Screen Structure** (`/frontend/mobile/src/screens/`)

**Admin Screens** (`/admin/`)
- Admin dashboard & management

**Auth Screens** (`/auth/`)
- Login
- Registration
- OTP verification
- Password recovery

**KYC Screens** (`/kyc/`)
- Step-by-step KYC forms
- Document upload
- Verification status

**Main Screens** (`/main/`)
- Dashboard (home)
- Policy browsing
- Policy purchase
- Payout history
- Profile management

#### **Client-Side Services** (`/frontend/mobile/src/services/`)
- `api.ts` - Axios/HTTP client for backend communication
- OAuth token management
- API interceptors for auth headers

#### **State Management** (`/frontend/mobile/src/context/`)
- React Context for:
  - User authentication state
  - KYC progress tracking
  - Selected policies
  - Payout information

---

### ML Services (Python)

#### **1. ML Microservice** (Port 8000)
**Purpose**: Real-time risk prediction and fraud detection

**Core Components:**
- **Risk Prediction Engine**: RandomForest model for zone disruption probability
- **Fraud Detection**: IsolationForest model for claim anomalies
- **Premium Calculator**: Dynamic pricing based on risk scores
- **Data Aggregator**: Collects real-time environmental data

**External Data Sources:**
- **Weather**: Open-Meteo API (rainfall, temperature, humidity)
- **Air Quality**: OpenAQ API (PM2.5, AQI)
- **Geolocation**: Nominatim (pin code → lat/long)
- **Civic Alerts**: Custom simulated data (protests, bandhs)
- **Platform Activity**: Q-Commerce order/rider metrics

**Feature Variables (10D):**
- `rainfall_3hr_avg`
- `temperature`
- `aqi`
- `pm25`
- `civic_alert` (boolean)
- `platform_orders` (active orders)
- `active_riders`
- `time_of_day_hours`
- `day_of_week`
- Historical earnings baseline

**Key Endpoints:**
- `POST /predict-risk` - Disruption probability for zone
- `POST /predict-fraud` - Fraud score for claim
- `POST /calculate-premium` - Dynamic premium pricing
- `POST /check-trigger` - Verify if disruption occurred

**Background Task Scheduler (Celery + Beat):**
- **Every 10 minutes**: Fetch environmental data for all zones
- Runs 5 parallel integrations per zone:
  1. Geolocation service (Nominatim)
  2. Weather service (Open-Meteo)
  3. AQI service (OpenAQ)
  4. Civic alert detection
  5. Platform activity monitoring
- Results cached in Redis for 24h

---

#### **2. Grid Event Service** (Port 8001)
**Purpose**: Disruption event detection and zone management

**Responsibilities:**
- Monitor active delivery zones
- Detect when zones become HALTED/UNSERVICEABLE
- Track zone status in real-time
- Trigger payout calculations

**Key Data:**
- Zone ID & metadata
- Zone status (ACTIVE, HALTED, DEGRADED)
- Event timestamp
- Expected loss estimates

---

#### **3. Pricing Engine** (Port 8003)
**Purpose**: Dynamic premium and payout calculation

**Features:**
- Platform-specific earnings normalization (daily vs. weekly)
- Risk-adjusted premium calculation
- Payout amount determination
- Historical claims aggregation

---

## 5. DATABASE SCHEMA (Prisma)

### Core Entities

```
User (id, email, phone, passwordHash, role, isVerified, otpCode, refreshToken)
├── KYCProfile (status, submittedAt, reviewedAt, reviewNote)
├── KYCBasicIdentity (fullName, dob, gender)
├── KYCPersonalDetails (address, city, state, pincode)
├── KYCIdentityVerification (aadhaarNumber, panNumber, aadhaarDocUrl, panDocUrl)
├── KYCPayoutSetup (method, upiId, accountNumber, ifscCode, accountHolder, bankName)
├── FraudAnalysis (gpsLatitude, gpsLongitude, riskScore, deviceIntegrity, networkType, velocityCheck)
├── Policy[] (planType, status, premium, startDate, endDate)
│   └── Payout[] (disruptionEventId, status, estimatedLoss, approvedPayout, transactionId)
└── RazorpayOrder[] (razorpayOrderId, amount, status, razorpayPaymentId)

WeeklyPlan (id, key, name, price, maxPayout, durationDays, eligibleDisruptionTypes)
├── Policy[]
└── RazorpayOrder[]

DisruptionEvent (id, type, title, expectedLoss, expectedPayout, occurredAt, expiresAt, verified)
└── Payout[]
```

### Key Relationships

| Entity | Relation | Cascade | Notes |
|--------|----------|---------|-------|
| User → KYC* | 1:1 | Cascade | One KYC profile per user |
| User → Policy | 1:N | Cascade | User can have multiple policies |
| User → Payout | Via Policy | - | Payouts through policies |
| Policy → WeeklyPlan | N:1 | SetNull | Plan can be deleted |
| Policy → Payout | 1:N | Cascade | Policy has multiple payouts |
| DisruptionEvent → Payout | 1:N | Cascade | Event triggers payouts |

### Enums

```
Role: DRIVER, ADMIN
KYCStatus: NOT_STARTED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED
PayoutMethod: UPI, BANK
```

---

## 6. DEPENDENCIES

### Backend npm Packages (Key)

**Core Framework:**
- `@nestjs/core@10.3.5` - NestJS framework
- `@nestjs/common@10.3.5` - Decorators & utilities

**Database & ORM:**
- `@prisma/client@5.10.2` - Type-safe ORM
- `prisma@5.10.2` - Dev dependency for migrations

**Authentication:**
- `@nestjs/jwt@10.2.0` - JWT module
- `@nestjs/passport@10.0.3` - Passport integration
- `passport@0.7.0` - Passport.js
- `passport-jwt@4.0.1` - JWT strategy
- `bcrypt@5.1.1` - Password hashing
- `@types/bcrypt@5.0.2` - Bcrypt types

**Validation:**
- `class-validator@0.14.1` - DTO validation
- `class-transformer@0.5.1` - Object transformation

**Email:**
- `nodemailer@6.9.13` - SMTP client
- `@types/nodemailer@6.4.14` - Nodemailer types

**Payments:**
- `razorpay@2.9.6` - Razorpay SDK

**Configuration:**
- `@nestjs/config@4.0.3` - Environment config
- `reflect-metadata@0.2.1` - Decorator support

**Server:**
- `@nestjs/platform-express@10.3.5` - Express adapter
- `rxjs@7.8.1` - Reactive programming

**Development:**
- `typescript@5.4.3` - TypeScript compiler
- `@nestjs/cli@10.3.2` - NestJS CLI
- `ts-node@10.9.2` - TypeScript executor
- `@types/node@20.12.2` - Node types
- `@types/express@4.17.21` - Express types

---

### Frontend npm Packages (Key)

**React & Navigation:**
- `react@19.1.0` - React core
- `react-native@0.81.5` - React Native
- `expo@~54.0.33` - Expo framework
- `expo-router@~6.0.23` - File-based routing

**Navigation Stack:**
- `@react-navigation/native@7.1.33` - Navigation core
- `@react-navigation/native-stack@7.14.5` - Stack navigator
- `@react-navigation/bottom-tabs@7.15.5` - Tab navigator
- `react-native-screens@~4.16.0` - Screen management
- `react-native-safe-area-context@~5.6.0` - Safe area

**UI & Graphics:**
- `react-native-svg@15.12.1` - SVG rendering
- `@expo/vector-icons@15.0.3` - Icon library
- `expo-image@~3.0.11` - Image component
- `react-native-gesture-handler@~2.28.0` - Gesture handling
- `react-native-reanimated@~4.1.1` - Animations

**Geolocation & Storage:**
- `expo-location@~19.0.8` - GPS/Location
- `@react-native-async-storage/async-storage@2.2.0` - Local storage

**Utilities:**
- `expo-constants@~18.0.13` - Constants (version, manifest)
- `expo-status-bar@~0.9.9` - Status bar control
- `expo-linking@~8.0.11` - Deep linking
- `expo-haptics@~15.0.8` - Haptic feedback

**Development:**
- `typescript@~5.9.2` - TypeScript
- `eslint@^9.25.0` - Linting
- `eslint-config-expo@~10.0.0` - Expo eslint config

---

### Python Dependencies

**ML Microservice & Grid Event Service:**
- `fastapi>=0.111.0` - Web framework
- `uvicorn[standard]>=0.30.0` - ASGI server
- `sqlalchemy>=2.0.30` - SQL toolkit
- `psycopg2-binary>=2.9.9` - PostgreSQL adapter
- `redis>=5.0.4` - Redis client
- `h3>=4.1.0` - Hexagonal spatial indexing
- `apscheduler` - Task scheduling
- `pydantic>=2.7.0` - Data validation
- `requests>=2.31.0` - HTTP client
- `celery>=5.4.0` - Distributed task queue
- `pandas>=2.2.0` - Data manipulation
- `numpy>=1.26.0` - Numerical computing
- `scikit-learn>=1.4.0` - ML algorithms
- `joblib>=1.3.0` - Model serialization

**Pricing Engine Additional:**
- Same as ML Microservice (full stack)

**Grid Event Service (Minimal):**
- FastAPI, Uvicorn, SQLAlchemy, Redis, H3, APScheduler

---

## 7. CONFIGURATION

### Backend Configuration (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/RideSafe_AI"

# Redis (Caching & Sessions)
REDIS_URL="redis://localhost:6379"

# Server
PORT=3001

# JWT Configuration
JWT_SECRET=<secret-key>
JWT_EXPIRES_IN=20m
JWT_REFRESH_SECRET=<refresh-secret>
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=development

# Email (Nodemailer - Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail-address>
SMTP_PASS=<app-password>

# AI/ML
GEMINI_API_KEY=<gemini-api-key>

# App Identity
APP_NAME=Aegis

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=<razorpay-key>
RAZORPAY_KEY_SECRET=<razorpay-secret>
```

### ML Microservice (docker-compose.yml)

```yaml
Services:
- api (Port 8000): FastAPI inference server
- worker: Celery task worker
- beat: Celery scheduler
- redis: Message broker & cache
- db: PostgreSQL (gigshield DB)

Environment Variables:
- DATABASE_URL=postgresql://postgres:12345@db:5432/gigshield
- CELERY_BROKER_URL=redis://redis:6379/0
```

### Frontend (.env)
- API_BASE_URL=http://<local-ip>:3001/api
- ML_API_URL=http://<local-ip>:8000

---

## 8. ENTRY POINTS & RUNNING SERVICES

### Backend (Node.js + NestJS)

```bash
# Terminal 1: Backend
cd backend

# Install dependencies
npm install

# Database setup (first time)
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:seed       # Seed initial data

# Run development server
npm run start:dev     # Runs on localhost:3001/api

# Other commands
npm run build         # Build TypeScript
npm run start:prod    # Run compiled version
npm run db:push       # Push schema to DB
npm run db:studio     # Open Prisma Studio (DB browser)
```

### Frontend (React Native + Expo)

```bash
# Terminal 2: Mobile Frontend
cd frontend/mobile

# Install dependencies
npm install

# Run on different platforms
npm start               # Start Expo development server
npm run android        # Run on Android simulator
npm run ios            # Run on iOS simulator
npm run web            # Run in web browser
npm run lint           # Lint code
npm run reset-project  # Reset to template
```

### ML Microservice (Python)

```bash
# Terminal 3: ML Microservice (Docker)
cd ml-calcultion/ml_microservice

# Build and run with Docker Compose
docker-compose up --build -d

# Or run locally (Python)
python start.py       # Runs on localhost:8000

# Train models locally
cd ml
python generate_dataset.py  # Generate synthetic 365-day data
python train_models.py      # Train RandomForest & IsolationForest models
# Updates: /ml_microservice/models/risk_model.pkl & fraud_model.pkl
```

### Grid Event Service (Python)

```bash
# Terminal 4: Grid Event Service
cd ml-calcultion/grid_event_service

python start.py       # Runs on localhost:8001
```

### Pricing Engine (Python)

```bash
# Terminal 5: Pricing Engine
cd ml-calcultion/pricing_engine

python start.py       # Runs on localhost:8003
```

### Automated Setup Scripts

```bash
# Linux
./linux.sh       # Auto-configures & starts all services

# macOS
./mac.sh         # Auto-configures & starts all services

# Windows
window.bat       # Auto-configures & starts all services
```

**Script Features:**
1. Detects local IP address
2. Configures frontend `.env` with backend URL
3. Starts all terminals/services automatically
4. Sets up database and seeds initial data

---

## 9. API ENDPOINTS

### Authentication (`/api/auth/`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/register` | None | Register new driver |
| POST | `/verify-otp` | None | Verify OTP after registration |
| POST | `/login` | None | Login with email/phone + password |
| POST | `/refresh` | None | Refresh expired access token |
| POST | `/logout` | JWT | Invalidate refresh token |
| POST | `/forgot-password` | None | Request password reset |
| POST | `/reset-password` | None | Reset password with OTP |
| POST | `/admin/login` | None | Admin login |
| POST | `/admin/verify-otp` | None | Admin OTP verification |
| POST | `/seed/create-admin` | None | Create first admin (dev only) |

---

### KYC Verification (`/api/kyc/`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/status` | JWT | Get KYC profile status |
| POST | `/basic-identity` | JWT | Submit name, DOB, gender |
| POST | `/personal-details` | JWT | Submit address, city, state |
| POST | `/identity-verification` | JWT | Submit Aadhaar & PAN |
| POST | `/payout-setup` | JWT | Configure payout method (UPI/Bank) |
| POST | `/submit` | JWT | Submit complete KYC for review |
| GET | `/admin/submissions` | JWT+Admin | Get pending KYC submissions |
| GET | `/admin/submission/:userId` | JWT+Admin | View user's KYC details |
| PATCH | `/admin/review/:userId` | JWT+Admin | Approve/Reject KYC |

---

### Fraud Analysis (`/api/fraud/`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/analyze` | JWT | Submit data for fraud analysis |
| GET | `/status` | JWT | Get fraud analysis result |
| GET | `/admin/submissions` | JWT+Admin | Get all fraud analyses |
| GET | `/admin/submission/:userId` | JWT+Admin | View user's analysis |
| PATCH | `/admin/review/:userId` | JWT+Admin | Manual review & override |

---

### Payments (`/api/payments/`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/create-order` | JWT | Create Razorpay order for policy |
| POST | `/verify` | JWT | Verify payment signature |

**Request Body Example:**
```json
{
  "weeklyPlanId": "plan-uuid-here"
}
```

---

### Insurance Plans (`/api/plans/`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/weekly` | None | Get all weekly plans |
| GET | `/me/purchased` | JWT | Get user's purchased policies |

**Weekly Plan Response:**
```json
{
  "id": "uuid",
  "key": "basic",
  "name": "Basic Coverage",
  "price": 99.0,
  "maxPayout": 1000.0,
  "durationDays": 7,
  "eligibleDisruptionTypes": ["ZONE_HALTED", "CIVIC_ALERT"]
}
```

---

### ML Microservice (`/predict-*`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/predict-risk` | Get disruption probability for zone |
| POST | `/predict-fraud` | Calculate fraud risk score |
| POST | `/calculate-premium` | Dynamic premium based on risk |
| POST | `/check-trigger` | Verify if disruption event occurred |

**Example: Predict Risk**
```json
// Request
{
  "zone_id": 1,
  "current_temperature": 42.5,
  "current_rainfall": 25.0,
  "current_aqi": 350.0,
  "time_of_day_hours": 14,
  "day_of_week": 3
}

// Response
{
  "disruption_probability": 0.9634,
  "risk_level": "HIGH",
  "confidence": 0.87
}
```

---

## 10. CURRENT ISSUES

### Issue #1: Backend npm Start Failure
**Evidence**: Terminal context shows `npm start` exited with code 1

**Possible Causes:**
1. Missing/mismatched dependencies
2. Prisma client not generated: `npm run db:generate`
3. DATABASE_URL env var not set or incorrect
4. Database connection failed
5. Missing migrations: `npm run db:migrate dev`

**Diagnostic Steps:**
```bash
cd backend
npm install                    # Reinstall deps
npm run db:generate           # Regenerate Prisma client
npm run db:migrate dev        # Run pending migrations
npm run start:dev             # Try again with detailed logs
```

---

### Issue #2: Prisma Studio Failure
**Evidence**: `npx prisma studio` exited with code 1

**Possible Causes:**
1. Database not running
2. Incorrect DATABASE_URL
3. Missing migrations
4. Prisma schema corruption

**Diagnostic Steps:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Verify schema
npx prisma db push

# Then try studio again
npx prisma studio
```

---

### Issue #3: Multi-Service Architecture Complexity
**Problem**: Running 5+ services (backend, frontend, 3 ML services) requires careful orchestration

**Solutions:**
1. Use provided setup scripts: `./linux.sh` or `./mac.sh`
2. Use tmux/screen for multiple terminals
3. Use Docker Compose for ML services: `cd ml-calcultion/ml_microservice && docker-compose up`
4. Consider using .env files for consistent URLs

---

### Issue #4: Environment Variable Management
**Problem**: Local IP changes, causing frontend API calls to fail

**Solution**: Setup scripts auto-detect IP:
```bash
LOCAL_IP=$(hostname -I | awk '{print $1}')  # Linux
# Update frontend/.env with correct API_BASE_URL
```

---

### Issue #5: Database State
**Evidence**: Context shows `prisma db seed` succeeded, but other commands failed

**Current State:**
- ✅ Database exists with schema
- ✅ Initial seed data present
- ❌ Connection issues from backend service

**Fix:**
```bash
# Full database reset (if needed)
npx prisma db push --force-reset  # WARNING: Deletes all data!
npm run db:seed

# Or just migrate
npm run db:migrate dev
```

---

## Summary Table

| Component | Technology | Port | Status |
|-----------|-----------|------|--------|
| **Backend API** | NestJS + PostgreSQL | 3001 | ❌ npm start failed |
| **Mobile Frontend** | React Native + Expo | 19000+ | ✅ Ready to start |
| **ML Microservice** | FastAPI + Celery | 8000 | ⚠️ Docker required |
| **Grid Event Service** | FastAPI | 8001 | ⚠️ Docker required |
| **Pricing Engine** | FastAPI | 8003 | ⚠️ Docker required |
| **PostgreSQL** | Database | 5432 | ✅ Seeded |
| **Redis** | Cache/Broker | 6379 | ⚠️ Check if running |

---

## Next Steps (Recommended)

1. **Fix Backend**:
   ```bash
   cd backend
   npm install
   npm run db:generate
   npm run db:migrate dev
   npm run start:dev
   ```

2. **Verify Database**:
   ```bash
   npm run db:studio  # Open web UI to inspect data
   ```

3. **Start Frontend** (in another terminal):
   ```bash
   cd frontend/mobile
   npm install
   npm start
   ```

4. **Start ML Services** (if needed):
   ```bash
   cd ml-calcultion/ml_microservice
   docker-compose up --build -d
   ```

5. **Test API** with Postman/Insomnia at `http://localhost:3001/api`

---

## Architecture Diagram (Text)

```
[Mobile App]
     ↓ HTTP
[NestJS Backend] ← JWT Auth
     ↓
[PostgreSQL] ← Data
     ↓
[Prisma ORM]
     ↓
[Controllers: Auth, KYC, Fraud, Payments, Plans]
     ↓
[External: Razorpay, Gmail, Gemini]

[ML Microservice (FastAPI)]
     ↓
[Celery + Beat Scheduler]
     ↓
[Redis Cache]
     ↓
[External APIs: Open-Meteo, OpenAQ, Nominatim]
     ↓
[Models: RandomForest (Risk), IsolationForest (Fraud)]
     ↓
[Predictions API] → [Backend]
```

**System Scalability:**
- ✅ Modular micro-services for ML
- ✅ Async job processing with Celery
- ✅ Stateless authentication with JWT
- ✅ Caching layer with Redis
- ⚠️ Single PostgreSQL (could shard by user ID)
- ⚠️ Single NestJS instance (could load balance)

---

## Key Insights

1. **Insurance Model**: Parametric (trigger-based) vs. traditional claim-based
2. **Real-time Engine**: 10-minute refresh cycle for environmental data
3. **Multi-platform Support**: Handles daily & weekly payout cycles per platform
4. **Privacy-First Auth**: OTP verification, no password storage on frontend
5. **Fraud Defense**: Multiple layers—device integrity, velocity checks, isolation forests
6. **Async Architecture**: Separates user-facing APIs from compute-heavy ML
7. **Development Mode**: All services connectable from local machine for debugging

---

**Report Generated**: March 27, 2026
**Report Version**: 1.0
**Project Status**: Development with issues (see Section 10)
