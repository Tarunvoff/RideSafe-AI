"""
main.py — Fraud Feature Extraction Service

Entry point for the FastAPI application.

Responsibilities:
  - Mount all routes
  - Configure CORS (ready for NestJS backend)
  - Health check endpoint
  - Lifespan hook for storage initialisation

Port: 8002 (runs alongside H3 service on 8001, ML service on 8000)

Architecture position:
  GPS/UPI/Device Input → [THIS SERVICE] → Rule Engine → ML Fraud Scoring
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.fraud_features import router as fraud_features_router
from routes.risk import router as risk_router
from storage.store import init_demo_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm-up: seed in-memory store with demo user data on startup."""
    logger.info("Fraud Feature Service starting — seeding demo data …")
    init_demo_data()
    logger.info("Demo data ready.")
    yield
    logger.info("Fraud Feature Service shutting down.")


app = FastAPI(
    title="Aegis Fraud Feature Extraction Service",
    description=(
        "Computes structured identity, location, and behaviour feature vectors "
        "for every incoming insurance event. Output is passed directly to the "
        "Rule Engine and ML Fraud Scoring model. "
        "Sits BEFORE fraud scoring in the pipeline: "
        "Input → /fraud-features → Rule Engine → ML Fraud Score. "
        "Exposes GET /api/v1/risk/:userId for Dev 1 bridging."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow NestJS orchestrator + internal services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(fraud_features_router)
app.include_router(risk_router)


@app.get("/health", tags=["Health"])
async def health():
    """Kubernetes / load balancer liveness probe."""
    return {"status": "healthy", "service": "fraud-feature-extraction", "port": 8002}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=False)
