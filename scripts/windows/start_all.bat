@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo   🚀 STARTING AEGIS DISTRIBUTED ENGINE (WINDOWS)
echo ========================================================
echo.

:: 1. Cleanup dangling processes
echo 🧹 Cleaning up legacy processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

:: 2. Detect Local IP for mobile connectivity
echo 🔍 Detecting local IP address...
SET "LOCAL_IP="
FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') DO (
    SET "TEMP_IP=%%A"
    SET "TEMP_IP=!TEMP_IP: =!"
    echo !TEMP_IP! | findstr /b "192.168." >nul
    if !errorlevel! equ 0 SET "LOCAL_IP=!TEMP_IP!"
    echo !TEMP_IP! | findstr /b "10." >nul
    if !errorlevel! equ 0 SET "LOCAL_IP=!TEMP_IP!"
)
if "%LOCAL_IP%"=="" (
    FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') DO (
        SET "TEMP_IP=%%A"
        SET "LOCAL_IP=!TEMP_IP: =!"
    )
)
echo ✅ Found Local IP: %LOCAL_IP%

:: 3. Update Frontend .env
echo 🔧 Updating Mobile App configuration...
set "FRONTEND_ENV_FILE=%~dp0..\..\frontend\mobile\.env"
set "FRONTEND_ENV_TMP_FILE=%~dp0..\..\frontend\mobile\.env.tmp"
if exist "%FRONTEND_ENV_FILE%" (
    findstr /v "EXPO_PUBLIC_API_URL" "%FRONTEND_ENV_FILE%" > "%FRONTEND_ENV_TMP_FILE%"
) else (
    echo. > "%FRONTEND_ENV_TMP_FILE%"
)
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3001/api>>"%FRONTEND_ENV_TMP_FILE%"
move /y "%FRONTEND_ENV_TMP_FILE%" "%FRONTEND_ENV_FILE%" >nul

:: 4. Boot Docker Infrastructure
echo [1/8] Booting Docker Containers (Kafka, Redis, Postres)...
cd /d %~dp0..\..\
docker compose up -d
echo ⏳ Waiting 15s for services to stabilize...
timeout /t 15 >nul

:: 5. Integrated Backend Ignition (Sequential Setup)
echo [2/8] Preparing Python virtual environment...
if not exist ml-services\.venv\Scripts\activate.bat (
    pushd ml-services
    python -m venv .venv
    popd
)

echo [3/8] Finalizing Backend Infrastructure...
cd /d %~dp0..\..\backend
call npm install
echo 🛠️  Pushing Actuarial Schema to Database...
call npx prisma db push --accept-data-loss
call npx prisma generate
echo 🧪 Seeding Production Data...
call npx prisma db seed

:: 6. Parallel Service Activation
echo [4/8] Starting ML Intelligence Services...
start "Aegis Insurance Service (8000)" cmd /k "cd /d %~dp0..\..\ml-services && .venv\Scripts\activate && cd ml-insurance-service && set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
start "Aegis Fraud Feature (8002)" cmd /k "cd /d %~dp0..\..\ml-services && .venv\Scripts\activate && cd fraud-feature-service && set USE_REDIS=True&& set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
start "Aegis Grid Event (8003)" cmd /k "cd /d %~dp0..\..\ml-services && .venv\Scripts\activate && cd grid-event-service && set USE_REDIS=True&& set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& set ML_SERVICE_URL=http://localhost:8000&& set H3_FEATURE_SERVICE_URL=http://localhost:8004&& uvicorn main:app --host 0.0.0.0 --port 8003 --reload"
start "Aegis H3 Feature (8004)" cmd /k "cd /d %~dp0..\..\ml-services && .venv\Scripts\activate && cd h3-feature-service && set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& set ML_INSURANCE_SERVICE_URL=http://localhost:8000&& set BACKEND_INTERNAL_URL=http://127.0.0.1:3001/api/internal/zone-state&& set APIRIS_ENABLED=true&& set APIRIS_ADAPTIVE_RETRY_ENABLED=true&& set APIRIS_ADAPTIVE_MAX_RETRIES=1&& set APIRIS_PREDICTED_LATENCY_MS=2000&& uvicorn main:app --host 0.0.0.0 --port 8004 --reload"

echo [5/8] Starting NestJS Backend (3001)...
start "Aegis Backend API" cmd /k "cd /d %~dp0..\..\backend && npm run start:dev"

echo [6/8] Starting Expo Mobile Application...
start "Aegis Mobile App" cmd /k "cd /d %~dp0..\..\frontend\mobile && npm install && npx expo start -c"

echo [7/8] Starting Admin Web Dashboard...
start "Aegis Admin Dashboard" cmd /k "cd /d %~dp0..\..\frontend\admin-dashboard && npm install && npm run dev"

echo.
echo ========================================================
echo ✅ [AEGIS_IGNITION_COMPLETE] All services are now online.
echo ========================================================
pause
