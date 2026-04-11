"""
main.py — Grid Event Service (Async Kafka Consumer)

Port: 8003  (consumer only — HTTP API for health / zone queries)

Architecture position:
  driver_telemetry (Kafka) → [THIS SERVICE] → ML risk-score → Redis zone:{h3} → zone_state_updates (Kafka)

Responsibilities:
  1. Consume driver_telemetry Kafka topic (h3_cell already embedded by producer)
  2. Aggregate GPS pings per H3 cell in a rolling 60-second window
  3. Call ml-insurance-service /risk-score with zone features
  4. Write zone:{h3} state to Redis (single source of truth)
  5. Publish zone_state_updates back to Kafka when state changes
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.zones import router as zones_router
from services.zone_aggregator import ZoneAggregator
from services.kafka_consumer import run_kafka_consumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

REQUIRED_ENV_VARS = (
    "KAFKA_BOOTSTRAP_SERVERS",
    "REDIS_URL",
    "ML_SERVICE_URL",
    "H3_FEATURE_SERVICE_URL",
)


def validate_required_env_vars() -> None:
    missing = [key for key in REQUIRED_ENV_VARS if not os.getenv(key, "").strip()]
    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Please set them before starting grid_event_service."
        )


validate_required_env_vars()

_aggregator: ZoneAggregator | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _aggregator
    logger.info("Grid Event Service starting — initialising zone aggregator …")
    _aggregator = ZoneAggregator()
    app.state.aggregator = _aggregator

    # Start Kafka consumer as a background task
    consumer_task = asyncio.create_task(
        run_kafka_consumer(_aggregator),
        name="kafka_consumer",
    )
    logger.info("Kafka consumer task launched.")
    yield
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    logger.info("Grid Event Service shutting down.")


app = FastAPI(
    title="Aegis Grid Event Service",
    description=(
        "Real-time H3 zone aggregation engine. "
        "Consumes driver_telemetry from Kafka, "
        "computes per-cell risk via ml-insurance-service, "
        "writes zone:{h3} state to Redis, "
        "and publishes zone_state_updates back to Kafka."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(zones_router)


@app.get("/health", tags=["Health"])
async def health():
    """Kubernetes / load balancer liveness probe."""
    return {
        "status": "healthy",
        "service": "grid-event-service",
        "port": 8003,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)
