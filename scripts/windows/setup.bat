@echo off
echo ========================================
echo   Aegis - Windows Setup Script
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed.
    exit /b 1
)

:: Install Backend deps and setup DB
echo 🛠️ Setting up Backend ^& Database...
cd backend
echo 📦 Installing backend dependencies...
call npm install
echo 🔗 Synchronizing Prisma Database Schema...
call npx prisma db push --accept-data-loss
call npx prisma generate
echo 🌱 Seeding initial data...
call npx prisma db seed
cd ..

:: Install Frontend deps
echo 📱 Installing mobile app dependencies...
cd frontend\mobile
call npm install
cd ..\..

:: Setup Python
echo 🐍 Preparing Python ML environment...
if not exist ml-services\.venv\Scripts\activate.bat (
    pushd ml-services
    python -m venv .venv
    popd
)

echo.
echo ========================================
echo ✅ Setup Complete!
echo ========================================
pause
