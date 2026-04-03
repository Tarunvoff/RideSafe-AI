@echo off
setlocal EnableExtensions
title RideSafe-AI Multi-Service Engine
color 0B
echo ========================================================
echo   🚀 STARTING RIDESAFE-AI DISTRIBUTED ENGINE (PHASE 2)
echo ========================================================
echo.

:: 1. Boot up the Docker Infrastructure silently
echo [1/8] Booting Docker Containers (Kafka, Zookeeper, Redis)...
pushd RideSafe-AI
docker-compose up -d
popd
timeout /t 3 >nuls

:: 2. Create + activate Python virtual environment (once)
echo [2/8] Preparing Python virtual environment...
if not exist RideSafe-AI\ml-calcultion\.venv\Scripts\activate.bat (
	echo Creating .venv under RideSafe-AI\ml-calcultion
	pushd RideSafe-AI\ml-calcultion
	python -m venv .venv
	popd
)
call RideSafe-AI\ml-calcultion\.venv\Scripts\activate.bat
python -m pip install --upgrade pip >nuls

:: 3. Install Python dependencies for each ML service
echo [3/8] Installing Python dependencies...
pushd RideSafe-AI\ml-calcultion\ml-insurance-service
pip install -r requirements.txt
popd
pushd RideSafe-AI\ml-calcultion\fraud-feature-service
pip install -r requirements.txt
popd
pushd RideSafe-AI\ml-calcultion\h3-feature-service
pip install -r requirements.txt
popd
pushd RideSafe-AI\ml-calcultion\grid_event_service
pip install -r requirements.txt
popd

:: 4. Boot Python ML Insurance Service
echo [4/8] Starting Python ML Insurance Service (Port 8000)...
start "ML Insurance Engine (8000)" cmd /k "cd RideSafe-AI\ml-calcultion && .venv\Scripts\activate && cd ml-insurance-service && title ML-INSURANCE-8000 && set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: 5. Boot Python Fraud Extraction Service
echo [5/8] Starting Python Fraud Feature Service (Port 8002)...
start "Fraud Extractor (8002)" cmd /k "cd RideSafe-AI\ml-calcultion && .venv\Scripts\activate && cd fraud-feature-service && title FRAUD-EXTRACTOR-8002 && set USE_REDIS=True&& set REDIS_URL=redis://localhost:6379/0&& uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

:: 6. Boot Python H3 Feature Aggregator
echo [6/8] Starting Python H3 Feature Service (Port 8004)...
start "H3 Feature Service (8004)" cmd /k "cd RideSafe-AI\ml-calcultion && .venv\Scripts\activate && cd h3-feature-service && title H3-FEATURE-8004 && set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& set ML_INSURANCE_SERVICE_URL=http://localhost:8000&& uvicorn main:app --host 0.0.0.0 --port 8004 --reload"

:: 7. Boot Python Grid Async Aggregator
echo [7/8] Starting Python Grid Aggregation Service (Port 8003)...
start "Kafka Grid Event Service (8003)" cmd /k "cd RideSafe-AI\ml-calcultion && .venv\Scripts\activate && cd grid_event_service && title GRID-EVENT-8003 && set USE_REDIS=True&& set KAFKA_BOOTSTRAP_SERVERS=localhost:9092&& set REDIS_URL=redis://localhost:6379/0&& set ML_SERVICE_URL=http://localhost:8000&& set H3_FEATURE_SERVICE_URL=http://localhost:8004&& uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

:: 8. Boot NestJS Main Backend
echo [8/8] Starting NestJS Orchestrator (Port 3001)...
start "NestJS API (3001)" cmd /k "cd RideSafe-AI\backend && title NESTJS-BACKEND-3001 && npm install && npm run start:dev"

:: Wait 3 seconds for NestJS to boot before launching mobile so endpoints resolve swiftly
timeout /t 3 >nuls

:: 9. Boot Expo Mobile Frontend
echo [9/9] Starting React Native Mobile Application...
start "React Native App" cmd /k "cd RideSafe-AI\frontend\mobile && title EXPO-MOBILE-APP && npm install && npx expo start --offline"

echo.
echo ========================================================
echo ✅ ALL SERVICES HAVE BEEN SUCCESSFULLY LAUNCHED!
echo ========================================================
echo You can safely close this master terminal window. The services will continue running in their individual pop-up windows.
pause
endlocal
