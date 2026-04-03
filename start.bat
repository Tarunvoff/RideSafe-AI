@echo off
setlocal EnableDelayedExpansion

echo =======================================
echo 🚀 Starting RideSafe-AI Magic Setup (Windows)...
echo =======================================
echo.

:: 1. Dynamically find the local IP address
echo 🔍 Detecting your local Wi-Fi IP address...

:: Look specifically for a 192.168.x.x or 10.x.x.x address to ignore Docker/Hyper-V (172.x)
FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') DO (
    SET TEMP_IP=%%A
    SET TEMP_IP=!TEMP_IP: =!
    echo !TEMP_IP! | findstr /b "192.168." >nul
    if !errorlevel! equ 0 (
        SET LOCAL_IP=!TEMP_IP!
        goto :IP_FOUND
    )
    echo !TEMP_IP! | findstr /b "10." >nul
    if !errorlevel! equ 0 (
        SET LOCAL_IP=!TEMP_IP!
        goto :IP_FOUND
    )
)

:: Fallback if none found
if "%LOCAL_IP%"=="" (
    FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') DO (
        SET LOCAL_IP=%%A
        SET LOCAL_IP=!LOCAL_IP: =!
        goto :IP_FOUND
    )
)

:IP_FOUND
if "%LOCAL_IP%"=="" (
    echo ❌ Could not determine your local IP address. Make sure you are connected to Wi-Fi.
    pause
    exit /b 1
)

echo ✅ Found Local IP: %LOCAL_IP%
echo.

:: 2. Setup Frontend .env dynamically
echo 🔧 Updating Mobile App configuration...
set "FRONTEND_ENV_FILE=frontend\mobile\.env"
set "FRONTEND_ENV_TMP_FILE=frontend\mobile\.env.tmp"
if exist "%FRONTEND_ENV_FILE%" (
    findstr /v "EXPO_PUBLIC_API_URL" "%FRONTEND_ENV_FILE%" > "%FRONTEND_ENV_TMP_FILE%"
) else (
    echo. > "%FRONTEND_ENV_TMP_FILE%"
)
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3001/api >> "%FRONTEND_ENV_TMP_FILE%"
move /y "%FRONTEND_ENV_TMP_FILE%" "%FRONTEND_ENV_FILE%" >nul

echo ✅ React Native set to connect to: http://%LOCAL_IP%:3001/api
echo.

:: 3. Setup Backend Database
echo 🛠️ Setting up Backend ^& Database...
cd backend

if not exist "node_modules\" (
    echo 📦 Installing backend dependencies...
    call npm install
)

echo 🔗 Synchronizing Prisma Database Schema...
call npx prisma db push --accept-data-loss
call npx prisma generate
echo 🌱 Seeding weekly plans and disruption events...
call npx prisma db seed
echo ✅ Database is ready!
echo.

:: 4. Start both servers together
echo 🔥 Starting Backend Servers...

echo 🖥️ Starting NestJS Backend Server in a new window...
:: Starts backend in a separate terminal window so we can run expo in this one
start "Aegis NestJS Backend" cmd /c "npm run start:dev"

echo ⏳ Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

cd ..
cd frontend\mobile

if not exist "node_modules\" (
    echo 📦 Installing frontend dependencies...
    call npm install
)

echo 📱 Starting Expo Go Server... (Scan the QR Code below!)
echo =======================================
call npx expo start -c

echo.
echo 🛑 Remember to close the separate Backend terminal window when you're done!
pause
