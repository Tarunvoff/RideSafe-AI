# Aegis ML Microservice

This is the production-ready ML microservice for Aegis: the AI-powered parametric insurance system for gig workers. It uses FastAPI for serving predictions related to Risk Scoring, Premium Pricing, Fraud Scoring, and Parametric Trigger Decisions.

## Folder Structure

```text
ml-insurance-service/
├── Dockerfile
├── requirements.txt
├── train_models.py (Generates standard initial weights & saves .pkl singletons)
├── main.py
├── data/ (Contains generated .pkl model files)
├── models/
│   ├── __init__.py
│   └── schemas.py (Pydantic validation schemas)
├── services/
│   ├── __init__.py
│   ├── risk_service.py
│   ├── pricing_service.py
│   ├── fraud_service.py
│   └── trigger_service.py
├── routes/
│   ├── __init__.py
│   ├── risk.py
│   ├── pricing.py
│   ├── fraud.py
│   └── trigger.py
└── utils/
    ├── __init__.py
    └── model_loader.py (Singleton to keep model prediction latency low)
```

## How To Run Locally

1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Train initial synthetic models (required first time):
   ```bash
   python train_models.py
   ```
3. Run the fastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## How To Run via Docker
```bash
docker build -t aegis-ml-service .
docker run -p 8000:8000 aegis-ml-service
```

## Example API Requests and Responses

### 1. Risk Score: `POST /risk-score`
Calculates Loss Fraction (Lf) using `XGBoost`.
**Request:**
```json
{
  "h3_cell": "89283082803ffff",
  "weather": {
    "rainfall": 0.5,
    "temperature": 32.0
  },
  "aqi": 150,
  "demand_ratio": 1.2
}
```

**Response:**
```json
{
  "Lf": 0.63,
  "risk_level": "MEDIUM"
}
```

### 2. Pricing: `POST /pricing`
Calculates Final Premium dynamically checking boundaries Constraints.
**Request:**
```json
{
  "Ew": 8000,
  "Lf": 0.4,
  "Ct": 0.6,
  "M": 0.1
}
```

**Response:**
```json
{
  "premium": 31.68
}
```

### 3. Fraud Score: `POST /fraud-score`
Outputs an isolation forest anomaly check coupled with supervised historical gradient boosting + rules engine check.
**Request:**
```json
{
  "gps": {
    "latitude": 12.3,
    "longitude": 45.6,
    "speed": 80.0
  },
  "device": {
    "id": "device_xyz123",
    "mismatch": false
  },
  "history": {
    "claims_filed": 2,
    "claims_rejected": 0
  }
}
```

**Response:**
```json
{
  "score": 0.32,
  "label": "MEDIUM"
}
```

### 4. Trigger logic: `POST /trigger`
Calculates rule-based event thresholds.
**Request:**
```json
{
  "Lf": 0.8,
  "zone_state": "HALTED",
  "fraud_score": 0.2
}
```

**Response:**
```json
{
  "decision": "APPROVED"
}
```
