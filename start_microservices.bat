@echo off
title RideSafe-AI Multi-Service Engine
color 0B
echo ========================================================
echo   🚀 STARTING RIDESAFE-AI DISTRIBUTED ENGINE (PHASE 2)
echo ========================================================
echo.

:: 1. Boot up the Docker Infrastructure silently
echo [1/7] Booting Docker Containers (Kafka, Zookeeper, Redis)...
docker-compose up -d
timeout /t 3 >nuls

:: 2. Boot Python ML Insurance Service
echo [2/7] Starting Python ML Insurance Service (Port 8000)...
start "ML Insurance Engine (8000)" cmd /k "cd ml-calcultion && venv\Scripts\activate && cd ml-insurance-service && title ML-INSURANCE-8000 && uvicorn main:app --host 0.0.0.0 --port 8000"

:: 3. Boot Python Fraud Extraction Service
echo [3/7] Starting Python Fraud Feature Service (Port 8002)...
start "Fraud Extractor (8002)" cmd /k "cd ml-calcultion && venv\Scripts\activate && cd fraud-feature-service && title FRAUD-EXTRACTOR-8002 && set USE_REDIS=True&& uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

:: 4. Boot Python Grid Async Aggregator
echo [4/7] Starting Python Grid Aggregation Service (Port 8003)...
start "Kafka Grid Event Service (8003)" cmd /k "cd ml-calcultion && venv\Scripts\activate && cd grid_event_service && title GRID-EVENT-8003 && set USE_REDIS=True&& uvicorn main:app --host 0.0.0.0 --port 8003 --reload"

:: 5. Boot Python H3 Feature Service
echo [5/7] Starting H3 Feature Service (Port 8004)...
start "H3 Feature Service (8004)" cmd /k "cd ml-calcultion && venv\Scripts\activate && cd h3-feature-service && title H3-FEATURE-8004 && set STRICT_REALTIME=true&& uvicorn main:app --host 0.0.0.0 --port 8004 --reload"

:: 6. Boot NestJS Main Backend
echo [6/7] Starting NestJS Orchestrator (Port 3001)...
start "NestJS API (3001)" cmd /k "cd backend && title NESTJS-BACKEND-3001 && npm run start:dev"

:: Wait 3 seconds for NestJS to boot before launching mobile so endpoints resolve swiftly
timeout /t 3 >nuls

:: 7. Boot Expo Mobile Frontend
echo [7/7] Starting React Native Mobile Application...
start "React Native App" cmd /k "cd frontend\mobile && title EXPO-MOBILE-APP && npx expo start --offline"

echo.
echo ========================================================
echo ✅ ALL MICROSERVICES HAVE BEEN SUCCESSFULLY LAUNCHED!
echo ========================================================
echo You can safely close this master terminal window. The services will continue running in their individual pop-up windows.
pause
