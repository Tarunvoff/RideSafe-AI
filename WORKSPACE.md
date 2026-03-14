# Guidewire Blink - Monorepo Structure

## Project Organization

```
guidewire-blink/
├── frontend/                  # Frontend Applications
│   ├── mobile/               # React Native/Expo Mobile App
│   │   ├── App.js
│   │   ├── app.json
│   │   ├── package.json
│   │   ├── babel.config.js
│   │   ├── tsconfig.json
│   │   ├── assets/           # Images, fonts, icons
│   │   └── src/              # Source code
│   │       ├── components/
│   │       ├── screens/
│   │       ├── navigation/
│   │       ├── services/
│   │       ├── hooks/
│   │       ├── constants/
│   │       ├── data/
│   │       └── utils/
│   │
│   └── web/                  # Next.js Web App
│       ├── app/              # Next.js app directory
│       ├── components/
│       ├── public/
│       ├── styles/
│       ├── package.json
│       ├── next.config.mjs
│       ├── tsconfig.json
│       └── postcss.config.mjs
│
├── backend/                   # Backend Services
│   ├── grid_event_service/   # Grid/Event Service
│   ├── ml_microservice/      # ML Microservice
│   └── pricing_engine/       # Pricing Engine
│
├── package.json              # Root workspace config
├── .env.example              # Environment variables template
├── WORKSPACE.md              # This file
└── README.md                 # Project documentation
```

## Setup & Installation

### Prerequisites
- **Node.js** 18+ & npm
- **Python** 3.8+ (for backend services)
- **Expo CLI** (for mobile development)
- **Git**

### 1. Clone Repository
```bash
git clone <repository-url>
cd guidewire-blink
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install All Dependencies
```bash
npm run install:all
```

This will:
- Install mobile app dependencies
- Install web app dependencies
- Install backend Python dependencies

## Development

### Start Mobile App (React Native)
```bash
cd frontend/mobile
npm start

# Or from root:
npm run dev:mobile

# For specific platform:
npm run android      # Android
npm run ios          # iOS
npm run web          # Web preview
```

### Start Web App (Next.js)
```bash
cd frontend/web
npm run dev

# Or from root:
npm run dev:web
```

### Start Backend Services
```bash
# From root:
npm run dev:backend

# Or manually:
cd backend/grid_event_service
python app/main.py
```

### Run All Services Concurrently
```bash
npm run dev:all
```

## Building

### Mobile App
```bash
cd frontend/mobile

# Build APK (Android)
eas build --platform android

# Build IPA (iOS)
eas build --platform ios
```

### Web App
```bash
cd frontend/web
npm run build
npm run start
```

## Project Structure Details

### frontend/mobile
- **React Native** with **Expo** framework
- Cross-platform: iOS, Android, and Web
- Features:
  - GPS spoofing detection
  - Insurance claims management
  - Risk analysis and scoring
  - User authentication and KYC
  - Real-time notifications

**Key Files:**
- `App.js` - Main app entry point
- `app.json` - Expo configuration
- `src/navigation/` - Navigation setup
- `src/screens/` - Screen components
- `src/services/` - API and business logic

### frontend/web
- **Next.js** 14+ with TypeScript
- Server-side rendering and static generation
- Components built with modern React patterns
- Features:
  - Globe/map visualization
  - Dashboard views
  - Admin panels

**Key Files:**
- `app/` - Next.js app directory with routes
- `components/` - Reusable React components
- `next.config.mjs` - Next.js configuration

### backend
See individual service READMEs:
- `backend/grid_event_service/` - Event and grid services
- `backend/ml_microservice/` - Machine learning models
- `backend/pricing_engine/` - Price calculations

## Useful Commands

### From Root
```bash
# Development setup
npm run install:all          # Install all dependencies
npm run dev:mobile           # Start mobile app
npm run dev:web              # Start web app
npm run dev:all              # Start both frontends

# Cleaning
npm run clean               # Remove node_modules and build artifacts

# Testing
npm run test                # Run mobile tests
```

### Mobile (frontend/mobile)
```bash
npm start                   # Start Expo development server
npm run android             # Android development
npm run ios                 # iOS development
npm run web                 # Web preview
npm run build               # Build for production
```

### Web (frontend/web)
```bash
npm run dev                 # Development server
npm run build               # Production build
npm run start               # Start production server
npm run lint                # Run linting
```

## Environment Variables

Create `.env` or `.env.local` in each app folder:

### Mobile (.env or .env.local)
```
API_URL=http://localhost:3000
GPS_CHECK_INTERVAL=5000
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env or config)
See individual service documentation.

## Troubleshooting

### Mobile App Issues
```bash
# Clear Expo cache
npm run clean

# Reset Expo
expo start -c
```

### Web App Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Port Conflicts
- Mobile: Expo uses ports 8081-8088
- Web: Next.js uses port 3000
- Backend: Various ports (check services)

## Git Workflow

Each section has its own branch naming:
```
feature/mobile-<feature-name>
feature/web-<feature-name>
feature/backend-<feature-name>
```

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Navigation](https://reactnavigation.org)
- [React Native Documentation](https://reactnative.dev)

## Support

For issues or questions:
1. Check individual README files in each service folder
2. Review service-specific documentation files
3. Check git issues and PRs
4. Consult team documentation

---

**Last Updated:** March 14, 2026
