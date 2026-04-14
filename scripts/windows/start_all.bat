@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo   🚀 STARTING AEGIS DISTRIBUTED ENGINE (WINDOWS)
echo ========================================================
echo.

:: 1. Detect Local IP for mobile connectivity
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

:: 2. Update Frontend .env
echo 🔧 Updating Mobile App configuration...
set "FRONTEND_ENV_FILE=frontend\mobile\.env"
set "FRONTEND_ENV_TMP_FILE=frontend\mobile\.env.tmp"
if exist "%FRONTEND_ENV_FILE%" (
    findstr /v "EXPO_PUBLIC_API_URL" "%FRONTEND_ENV_FILE%" > "%FRONTEND_ENV_TMP_FILE%"
) else (
    echo. > "%FRONTEND_ENV_TMP_FILE%"
)
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3001/api>>"%FRONTEND_ENV_TMP_FILE%"
move /y "%FRONTEND_ENV_TMP_FILE%" "%FRONTEND_ENV_FILE%" >nul

:: 3. Boot Docker
echo [1/8] Booting Docker Containers (Kafka, Redis, Postres)...
docker compose up -d
timeout /t 5 >nul

:: 4. Setup Python Venv if needed
echo [2/8] Preparing Python virtual environment...
if not exist ml-calcultion\.venv\Scripts\activate.bat (
    pushd ml-calcultion
    python -m venv .venv
    popd
)

:: 5. Install Dependencies (Silent)
echo [3/8] Ensuring service dependencies are installed...
start /min "Aegis Installer" cmd /c "cd backend && npm install && npx prisma db push --accept-data-loss && npx prisma generate && npx prisma db seed && exit"

:: 6. Start ML Services
echo [4/8] Starting ML Intelligence Services...
start "Aegis Insurance Service (8000)" cmd /k "cd ml-calcultion && .venv\Scripts\activate && pip install -r ml-insurance-service/requirements.txt && cd ml-insurance-service && set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
start "Aegis Fraud Feature (8002)" cmd /k "cd ml-calcultion && .venv\Scripts\activate && pip install -r fraud-feature-service/requirements.txt && cd fraud-feature-service && set USE_REDIS=True&& set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
start "Aegis Grid Event (8003)" cmd /k "cd ml-calcultion && .venv\Scripts\activate && pip install -r grid_event_service/requirements.txt && cd grid_event_service && set USE_REDIS=True&& set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8003 --reload"
start "Aegis H3 Feature (8004)" cmd /k "cd ml-calcultion && .venv\Scripts\activate && pip install -r h3-feature-service/requirements.txt && cd h3-feature-service && set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8004 --reload"

:: 7. Start Backend
echo [5/8] Starting NestJS Backend (3001)...
start "Aegis Backend API" cmd /k "cd backend && npm run start:dev"

:: 8. Start Mobile App
echo [6/8] Starting Expo Mobile Application...
start "Aegis Mobile App" cmd /k "cd frontend\mobile && npm install && npx expo start -c"

echo.
echo ========================================================
echo ✅ ALL AEGIS SERVICES HAVE BEEN LAUNCHED!
echo ========================================================
pause
