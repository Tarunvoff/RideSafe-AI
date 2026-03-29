# RideSafe-AI Machine Learning & Calculation Core
This directory houses the distributed, loosely-coupled microservice engine powering **RideSafe-AI**. The entire architecture acts as a real-time geospatial insurance engine, built upon the fundamental principle of the **Uber H3 Spatial Grid (Resolution 8)**.

All location data is mapped to H3 cells before processing, allowing us to build instantaneous risk structures, fraud clustering detection, and dynamic pricing metrics aggregated at a block-by-block level, independent of specific coordinates.

---

## 🏛 The Architecture (H3-First)

The architecture is split into two distinct operational flows connected tightly via a **Redis Single-Source of Truth (SSOT)**:

### 1. The Asynchronous Flow (Grid Telemetry)
* **Ingestion:** The frontend transmits continuous user GPS data into the NestJS backend.
* **Stream Conversion:** NestJS strictly converts every coordinate into an H3 string (Res 8) and pipes it continuously into Kafka (`driver_telemetry`).
* **Grid State Engine:** The newly incorporated `grid_event_service` continuously aggregates these GPS streams, collapsing them into densities of active riders per H3 cell.
* **The SSOT:** It evaluates the safety metric (`Lf`) for that designated traffic cluster and flushes the absolute grid state (`zone:{h3_cell}`) down into Redis every 10 seconds. 

### 2. The Synchronous Flow (Point-in-Time Evaluation)
* Because Redis inherently contains the state of the world at any given millisecond, user-initiated insurance claims, pricing quotes, and anomaly checks (hitting ports `8000` & `8002`) run purely synchronously.
* Requests query Redis instantaneously in `O(1)` time fetching the localized H3 context—bypassing the need for heavy, relational `JOIN` operations—meaning Parametric Trigger APIs can instantly approve claims entirely untouched by human agents.

---

## 🚦 Service Registry

| Microservice | Port | Primary Function | State Persistence |
|--------------|------|------------------|-------------------|
| `ml-insurance-service` | `8000` | Machine Learning Inference Engine. Calculates Premium Pricing `Pr = Ew × α × Lf × Ct × (1 + M) × zone_multiplier`. Executes the zero-touch Parametric Trigger logic (Claim Payout Approvals). | Reads Redis H3 logic |
| `h3-feature-service` | `8001` | External static integration bridge tracking persistent Environmental data (Weather, AQI) per zone. | Stateless |
| `fraud-feature-service`| `8002` | Anomaly Detection pipeline. Extracts Behavioral, Geographic, and H3-specific historical metrics (GPS bouncing, H3 physical presence checking, and cluster density bounds). | Reads & Writes Redis |
| `grid_event_service` | `8003` | Real-time Kafka event Consumer. Computes continuous `zone_state` logic (`HALTED`, `DANGEROUS`, `NORMAL`) across the entirety of active hex grids. | Writes Redis SSOT |

---

## 🏁 Setup & Execution

### Prerequisites
You need a running instance of Kafka on Port `9092` and Redis on Port `6379`. The simplest, cross-platform method is Docker Desktop via the provided `docker-compose.yml` in the project root:

```bash
# In the root RideSafe-AI directory
docker-compose up -d
```

### Starting the Grid Matrix
To activate the entirety of the engine, you must start the three active calculation services inside this directory:

1. **Activate your python virtual environment**  
   Windows: `venv\Scripts\activate`  
   Mac/Linux: `source venv/bin/activate`

2. **Boot the ML Gateway (Insurance / Trigger API)**
   ```bash
   cd ml-insurance-service
   python main.py  # or uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Boot the Fraud Extractor**
   ```bash
   cd ml-calcultion/fraud-feature-service
   $env:USE_REDIS="True"  # Linux: export USE_REDIS="True"
   uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```

4. **Boot the ASYNC Grid Tracking Engine**
   ```bash
   cd ml-calcultion/grid_event_service
   $env:USE_REDIS="True"
   uvicorn main:app --host 0.0.0.0 --port 8003 --reload
   ```

### E2E Testing Pipeline
We have provided an automated Python test hook that fires identical logic to your NestJS Kafka streaming framework. It forces a Burst Event into a specific H3 cell and measures whether the Parametric Engine correctly triggers the `HOLD / MANUAL REVIEW` or `APPROVAL` flow automatically.

```bash
# From inside the ml-calibration directory
python test_e2e_h3.py
```
