"""
main.py — H3 Feature Aggregation Service

Entry point for the FastAPI application.

Responsibilities:
  - Mount all routes
  - Configure CORS (ready for NestJS backend)
  - Health check endpoint
  - Lifespan events: start/stop Kafka consumer (Task 1)

Port: 8001 (runs alongside ML service on 8000)
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.features import router as features_router
from routes.pipeline import router as pipeline_router
from services.kafka_consumer import run_h3_kafka_consumer

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the Kafka consumer background task on startup; cancel cleanly on shutdown."""
    logger.info("Starting H3 Feature Service — launching Kafka consumer...")
    consumer_task = asyncio.create_task(run_h3_kafka_consumer())
    yield
    # Shutdown: cancel consumer gracefully
    logger.info("Shutting down — cancelling Kafka consumer task...")
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    logger.info("H3 Feature Service shutdown complete.")


app = FastAPI(
    title="Aegis H3 Feature Aggregation Service",
    description=(
        "Converts H3 grid cells into ML-ready feature vectors by fetching "
        "real-world weather (Open-Meteo) and AQI (OpenAQ v3) data. "
        "Orchestrates the full insurance pipeline: "
        "GPS → H3 → /features → /risk-score (port 8000) → /pricing (port 8000). "
        "Also consumes driver_telemetry Kafka topic to maintain a live per-cell speed average."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow NestJS backend + frontend to call directly if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(features_router)
app.include_router(pipeline_router)


@app.get("/health", tags=["Health"])
async def health():
    """Kubernetes / load balancer liveness probe."""
    return {"status": "healthy", "service": "h3-feature-aggregation"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)

