# GigShield: ML Intelligence Microservice

This repository houses the standalone **Machine Learning & Real-Time Intelligence Microservice** for the GigShield parametric insurance platform. 

It is designed to operate completely independently from your core user-facing transactional backend. It continually ingests real-time environmental APIs (Open-Meteo, OpenAQ, Nominatim, Civic Alerts), processes features through Pandas, evaluates them against pre-trained `RandomForest` and `IsolationForest` models, and provides predictive scoring endpoints (via FastAPI) for your core systems to consume.

---

## 🏛 Microservice Architecture

This microservice handles the high-compute ML and data aggregation layers, meaning your main user backend never slows down mapping geospatial polygons or running inference. 

**Core Components:**
1. **Background Aggregators (`/integrations`)**: Hooks into Open-Meteo, OpenAQ, and caching layers (Redis) to continuously map external real-world disruptions into structured time-series data.
2. **Feature Engineering Engine (`/ml`)**: Contains scripts to convert raw API strings into structured 10D NumPy arrays (e.g. tracking `rainfall_3hr_avg` or `civic_alerts`).
3. **ML Training Pipelines (`/ml`)**: Automatically generates massive 365-day synthetic CSV datasets and trains robust `scikit-learn` algorithms on them.
4. **FastAPI Inference Layer (`/app/main.py`)**: A lightning-fast ASGI server that loads serialized `.pkl` models into memory and serves predictions dynamically over REST.
5. **Celery Task Queue (`/app/workers`)**: Manages the 10-minute async loops triggering the environment fetches autonomously.

---

## � Real-Time Data Pipeline

The real-time data engine operates as the continuous operations heartbeat of the microservice. The orchestration relies on a specialized `DataAggregator` inside `integrations/data_aggregator.py`:

**1. The 10-Minute Scheduler**
A continuous looping schedule triggers exactly once every 10 minutes. When it wakes up, it targets an array of live delivery zones (e.g. Koramangala, Indiranagar) to kick off fetch cycles.

**2. Five Parallel Integrations**
For each zone, the loop queries 5 independent third-party architectures concurrently:
* **`geolocation_service`**: Resolves pin codes into Latitude/Longitude mapping arrays via the **Nominatim** API. Lookups are internally cached in **Redis** for 24 hours to evade aggressive open-source request limits.
* **`weather_service`**: Retrieves millimeter rainfall, ambient temperature, and humidity directly from the **Open-Meteo API**.
* **`aqi_service`**: Scans a 10km radius of the zone's coordinate mapping across the **OpenAQ** architecture to locate live local `PM2.5` & `AQI` arrays.
* **`civic_alert_service`**: Listens for critical infrastructure disturbances simulated by scanning payloads for strings like `"Protest"` or `"Bandh"`.
* **`platform_activity_service`**: Calculates extreme load variance on Q-Commerce apps by tracking active rider thresholds against demand influx.

**3. Unified Normalization**
Since these interfaces all respond with aggressively different file structures (messy nested JSON arrays, coordinates, missing nodes), the Aggregator cleanly flattens all of them into a singular perfectly clean dictionary:
```json
{
  "zone": "Koramangala",
  "rainfall": 0.0,
  "temperature": 29.5,
  "aqi": 180.0,
  "pm25": 72.0,
  "platform_orders": 123,
  "active_riders": 70,
  "civic_alert": false,
  "timestamp": "2026-03-10T22:19:00"
}
```
This normalized object is then automatically bridged into the AI models via the `/predict-risk` endpoint to generate parametric disruption alerts dynamically globally!

---

## �🚀 Getting Started

Deploying this microservice is fully containerized and trivial. It spins up its own PostgreSQL instance for tracking environment states and its own Redis broker for caching Nominatim requests.

### 1. Run the Environment (Docker)
Ensure Docker is running, then boot the API, Database, Cache, and Worker nodes:
```bash
cd ml_microservice
docker-compose up --build -d
```
The FastAPI instance will now be live at `http://localhost:8000`.

### 2. (Optional) Train the Machine Learning Models Locally
If you want to re-train the models with newly simulated 365-day weather data rules, you can run the pipeline directly inside the virtual environment:
```bash
cd ml_microservice/ml
python generate_dataset.py
python train_models.py
```
*This places the updated `risk_model.pkl` and `fraud_model.pkl` into the `/ml_microservice/models` directory, which the API immediately loads.*

---

## 🔌 API Contract (Endpoints)

Your core backend (e.g. Node.js or Spring Boot) or frontend (React Native) can interact with this Microservice using the following REST interface:

### 1. Disruption Risk Prediction
Evaluates the real-time probability of an environmental disruption occurring in a requested zone.
`POST /predict-risk`
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
  "risk_level": "HIGH"
}
```

### 2. Parametric Fraud Detection
Scores a claim payload against an unsupervised Isolation Forest anomaly detection algorithm to prevent fraudulent manual claims.
`POST /fraud-score`
```json
// Request
{
  "claim_id": 1023,
  "rider_claim_frequency": 6,
  "activity_count_24h": 3,
  "payout_distance_km": 15.5
}

// Response
{
  "claim_id": 1023,
  "is_fraudulent": true,
  "fraud_score": 30.22
}
```

### 3. Claim Premium Pricing Calculation
Determines the INR cost of a weekly parametric cover based on the worker's history and their operating zone's underlying risk footprint.
`POST /predict-premium`
```json
// Request
{
  "rider_id": 55,
  "zone_risk_score": 0.85,
  "historical_claims_count": 2
}

// Response
{
  "premium_amount": 60.08,
  "currency": "INR"
}
```

### 4. Operations Trigger Verification
Checks the aggregated civic/weather APIs for any threshold breaches across specific zones to decide if parametric payouts are warranted globally.
`POST /trigger-check`
```json
// Request
{
  "zone_id": 1,
  "temperature": 41.0,
  "rainfall": 60.5,
  "aqi": 425.0
}

// Response
{
  "zone_id": 1,
  "trigger_fired": true,
  "reasons": [
    "HIGH_RAINFALL",
    "EXTREME_HEAT",
    "TOXIC_AQI"
  ]
}
```

---

## 🛠️ Built With

* **FastAPI** (Python 3.11 ASGI REST Framework)
* **Scikit-Learn & Joblib** (Random Forest & Isolation Forest Implementation)
* **Pandas & NumPy** (Data Generation & Engineering)
* **Celery & Redis** (Asynchronous task queues and Geospatial Caching)
* **Docker** (Containerized orchestration mapping `web`, `beat`, `worker`, `db`, and `redis`)
