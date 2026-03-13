# RideSafe-AI: ML & Grid Intelligence Architecture

This document summarizes the progress and architecture of the Machine Learning (`ml_microservice`) and Grid Event (`grid_event_service`) microservices built for RideSafe-AI.

## 1. Machine Learning Microservice (`port: 8000`)
The ML Microservice serves as the intelligence core, processing live environmental metrics, calculating risk profiles, and detecting fraudulent activities.

### Core Features & Models
- **Risk Prediction Model (`risk_model.pkl`)**: A Random Forest classifier trained on contextual data (rainfall, AQI, time of day) to predict the probability of operational disruption. 
- **Fraud Detection Model (`fraud_model.pkl`)**: An Isolation Forest model trained to detect anomalous driver behavior (e.g., extremely high frequency of claims with unusually low activity count).
- **Model CI/CD**: Created an automated dataset generation and training script (`train_models.py`) to synthesize data and package `.pkl` artifacts. Hardened API endpoints to fallback gracefully if models are missing or corrupt.

### Live Data Integrations
- **Weather Service (`weather_service.py`)**: Interacts with Open-Meteo APIs to collect both 15-minute live snapshots and hourly precipitation (rainfall in mm) matching the exact features expected by the ML model.
- **Air Quality Service (`aqi_service.py`)**: Integrates with the **OpenAQ v3 API**. It utilizes a two-step discovery flow:
  1. Searches for nearby PM2.5 and PM10 sensors via `GET /v3/locations` (progressively expanding radius up to 50km).
  2. Queries exact live measurements via `GET /v3/sensors/{id}/measurements`.
  3. Uses US EPA linear interpolation to correctly calculate the global AQI index from PM2.5 (preferred) or PM10 (fallback).

### Zone Intelligence API (`GET /zone-intelligence/{zone_id}`)
- The centerpiece API that unifies DB records, live API calls, and ML inference.
- If fresh environmental data exists in PostgreSQL, it is used.
- If DB data is missing, the service uses known zone coordinates (e.g., Koramangala, Indiranagar) to fetch **live weather and AQI dynamically**.
- Output contains calculated `disruption_probability`, `risk_level`, and a `recommended_grid_state`.

---

## 2. Grid Event Microservice (`port: 8001`)
The Grid Event Microservice translates abstract ML risk metrics into actionable geographical restrictions using H3 hexagons.

### Core Features
- **H3 Geospatial Indexing**: Translates flat geographic coordinates (latitude & longitude) into standardized H3 hexagonal grid cells to optimize storage, risk mapping, and distance calculations.
- **State Management**: Consumes the `recommended_grid_state` from the ML Microservice and maps it directly to geographical areas.
- **Event Triggers**: Operates based on threshold conditions:
  - `HALTED`: Rainfall > 40mm or ML Disruption Probability > 80%.
  - `DANGEROUS`: AQI > 300.
  - `SLOW`: Rainfall between 20-40mm.
  - `NORMAL`: All other safe conditions.
- **Client APIs**: Acts as the single source of truth for the mobile/frontend apps to query which zones/hexagons are safe to ride in and which are restricted.

---

## 3. Data Flow & Automation
1. **Aggregator (`data_aggregator.py`)**: A chron/scheduler loop constantly aggregates zone platform activity, weather, and traffic data.
2. **Database Write**: The aggregator posts to the ML microservice which saves historical slices into the PostgreSQL `EnvironmentData` table.
3. **Inference**: High-throughput read calls hit the ML layer, triggering rapid RF model inference over the latest cached environment slices (backed by Redis cache for speed).
4. **Grid Mapping**: The Grid Event service picks up state changes and modifies regional H3 hex definitions, notifying clients of localized downtime.
