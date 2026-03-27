"""
main.py — H3 Feature Aggregation Service

Entry point for the FastAPI application.

Responsibilities:
  - Mount all routes
  - Configure CORS (ready for NestJS backend)
  - Health check endpoint
  - Lifespan events (future: warm-up, DB connections)

Port: 8001 (runs alongside ML service on 8000)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.features import router as features_router
from routes.pipeline import router as pipeline_router

app = FastAPI(
    title="Aegis H3 Feature Aggregation Service",
    description=(
        "Converts H3 grid cells into ML-ready feature vectors by fetching "
        "real-world weather (Open-Meteo) and AQI (OpenAQ v3) data. "
        "Orchestrates the full insurance pipeline: "
        "GPS → H3 → /features → /risk-score (port 8000) → /pricing (port 8000)"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
