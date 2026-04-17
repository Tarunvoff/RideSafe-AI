"""
── Aegis Adversarial Feature Provisioner ──────────────────────────────────────

This service implements the high-fidelity extraction of identity, location, 
and behavioral telemetry. It transforms raw adversarial inputs into 
production-ready feature vectors for high-order risk resolution.

For comprehensive feature engineering specifications, refer to:
- ARCHITECTURE/SECURITY_AND_FRAUD_MATRIX.md
- ARCHITECTURE/DATA_SCHEMA_AND_STATE.md
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.fraud_features import router as fraud_features_router
from routes.risk import router as risk_router
from storage.store import init_baseline_behavior_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Orchestrating Sovereign Behavioral State Initialization on startup."""
    logger.info("Adversarial Feature Provisioner initialized - Provisioning behavior state")
    init_baseline_behavior_store()
    yield
    logger.info("Adversarial Feature Provisioner - Sovereign shutdown initiated.")


app = FastAPI(
    title="Aegis Adversarial Feature Provisioner",
    description=(
        "Computes structured high-fidelity identity, location, and behavioral "
        "telemetry vectors for every incoming sovereign insurance event. "
        "Output is passed directly to the Sovereign Risk Core for high-order "
        "resolution. Sits at the telemetry ingress boundary of the pipeline."
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
