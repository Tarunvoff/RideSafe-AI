# 🚀 Quick Start Guide

## Getting Started with Guidewire Blink

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- Git
- Python 3.8+ (optional, for backend services)

### 1️⃣ Clone & Setup (First Time)

```bash
# Clone the repository
git clone <your-repo-url>
cd guidewire-blink

# Run automated setup
./setup.sh

# Create environment file
cp .env.example .env

# Edit .env with your configuration (optional)
nano .env
```

### 2️⃣ Start Development

#### Option A: Mobile App Only
```bash
cd frontend/mobile
npm start

# Then choose:
# - Press 'a' for Android
# - Press 'i' for iOS  
# - Press 'w' for Web preview
```

#### Option B: Web App Only
```bash
cd frontend/web
npm run dev

# Opens at http://localhost:3000
```

#### Option C: Both Apps (from root)
```bash
npm run dev:all

# Mobile: http://localhost:8081
# Web: http://localhost:3000
```

### 3️⃣ Project Structure You'll Work With

```
frontend/
├── mobile/              # React Native + Expo
│   └── src/
│       ├── screens/    # App screens
│       ├── components/ # Reusable components
│       └── services/   # API calls & business logic
│
└── web/                # Next.js
    ├── app/           # Pages & routes
    ├── components/    # React components
    └── public/        # Static assets
```

### 4️⃣ Common Commands

```bash
# From project root
npm run install:all    # Install all dependencies
npm run dev:mobile    # Start mobile app only
npm run dev:web       # Start web app only
npm run dev:all       # Start both (requires concurrently)
npm run clean         # Clean all build artifacts

# From frontend/mobile
npm start             # Start Expo dev server
npm run android       # Run on Android
npm run ios           # Run on iOS
npm run web           # Preview on web

# From frontend/web
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
```

### 5️⃣ Editing Code

#### Mobile (React Native)
- Make changes in `frontend/mobile/src/`
- Changes auto-refresh in Expo
- Use platform-specific code with `.ios.js` and `.android.js` extensions

#### Web (Next.js)
- Make changes in `frontend/web/`
- Changes auto-refresh in browser
- Routes are file-based in `app/` directory

### 6️⃣ Available Extensions (VSCode)

Recommended to install:
- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **Prettier** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **Python** (ms-python.python)

### 7️⃣ Troubleshooting

#### "Port already in use"
```bash
# Find and kill process using port 8081
lsof -i :8081
kill -9 <PID>

# Or use different port
cd frontend/mobile
npm start -- --port 8082
```

#### "Module not found" errors
```bash
# Clear and reinstall
cd frontend/mobile  # or frontend/web
rm -rf node_modules
npm install
```

#### "Expo errors"
```bash
cd frontend/mobile
npm start -c  # Clear cache
```

#### Backend/API not connecting
- Ensure backend services are running
- Check `.env` API URLs
- Verify network connectivity
- Check firewall settings

### 8️⃣ File Organization Guide

**✅ Do's:**
- Keep components small and reusable
- Use consistent naming conventions
- Place API calls in `/services`
- Keep styles organized by component

**❌ Don'ts:**
- Don't put business logic in components
- Don't create deeply nested folder structures
- Don't hardcode API URLs
- Don't commit `.env` files

### 9️⃣ Getting Help

1. Check [WORKSPACE.md](./WORKSPACE.md) for detailed documentation
2. Review individual service READMEs in `backend/`
3. Check error messages carefully - they often suggest fixes
4. Google the error + "React Native" or "Next.js"
5. Ask the team in your project chat

### 🔟 Next Steps

1. **Read** [WORKSPACE.md](./WORKSPACE.md) for full documentation
2. **Explore** the project structure
3. **Create** a feature branch: `git checkout -b feature/your-feature`
4. **Start** coding! 🎉

---

**Questions?** Ask your team lead or check the project's GitHub issues.

**Happy coding!** 💻✨
