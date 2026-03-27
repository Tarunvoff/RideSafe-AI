"""
services/pipeline_service.py

End-to-end pipeline:
  GPS (lat, lng) → H3 cell → /features → /risk-score → /pricing

All service calls are async. The ML microservice (port 8000) is called
directly via httpx. This service acts as the single pipeline orchestrator.
"""

import logging
import httpx
import h3 as h3lib
from config import H3_RESOLUTION
from services.feature_service import get_features
from models.schemas import PipelineRequest, PipelineResponse, FeatureResponse

logger = logging.getLogger(__name__)

ML_SERVICE_URL = "http://localhost:8000"
ML_TIMEOUT = 10.0


def get_zone_state(civic_alert: bool, Lf: float) -> str:
    """
    Determine the real-time state of the zone for routing decisions.
    """
    if civic_alert:
        return "HALTED"
    
    if Lf > 0.75:
        return "HALTED"
    elif Lf > 0.6:
        return "DANGEROUS"
    elif Lf > 0.4:
        return "SLOW"
    else:
        return "NORMAL"


async def run_pipeline(request: PipelineRequest) -> PipelineResponse:
    # ── Step 1: GPS → H3 cell ─────────────────────────────────────────────────
    h3_cell = h3lib.latlng_to_cell(request.lat, request.lng, H3_RESOLUTION)
    logger.info(f"GPS ({request.lat},{request.lng}) → H3 cell: {h3_cell}")

    # ── Step 1.5: Check Full Pipeline Cache ───────────────────────────────────
    # If the feature vector for this cell is cached, we can bypass the ML calls
    # as long as Ew, Ct, M haven't changed. To simplify, we cache the whole response
    # keyed by (h3_cell, Ew, Ct, M).
    cache_key = f"{h3_cell}_{request.Ew}_{request.Ct}_{request.M}"
    from cache.store import get_cached, set_cached
    cached_pipeline = get_cached(cache_key)
    if cached_pipeline:
        logger.info(f"Full pipeline cache hit for {cache_key}")
        return PipelineResponse(**cached_pipeline["features"])

    # ── Step 2: H3 → Feature vector (this service, port 8001) ────────────────
    features: FeatureResponse = await get_features(h3_cell)
    logger.info(f"Features fetched for {h3_cell}: rainfall={features.rainfall}, aqi={features.aqi}")

    # ── Step 3: Features → /risk-score (ML service, port 8000) ───────────────
    risk_payload = {
        "h3_cell": h3_cell,
        "weather": {
            "rainfall": features.rainfall,
            "temperature": features.temperature,
        },
        "aqi": features.aqi,
        "demand_ratio": features.demand_ratio,
        "historical_disruption_frequency": features.historical_risk,
        "zone_volatility": 0.5,  # future: derive from zone DB
    }

    async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
        risk_resp = await client.post(f"{ML_SERVICE_URL}/risk-score", json=risk_payload)
        risk_resp.raise_for_status()
        risk_data = risk_resp.json()

    Lf = risk_data["Lf"]
    risk_level = risk_data["risk_level"]
    logger.info(f"Risk score: Lf={Lf}, level={risk_level}")

    # ── Step 4: Lf → /pricing (ML service, port 8000) ────────────────────────
    pricing_payload = {
        "Ew": request.Ew,
        "Lf": Lf,
        "Ct": request.Ct,
        "M": request.M,
    }

    async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
        pricing_resp = await client.post(f"{ML_SERVICE_URL}/pricing", json=pricing_payload)
        pricing_resp.raise_for_status()
        pricing_data = pricing_resp.json()

    premium = pricing_data["premium"]
    logger.info(f"Premium: ₹{premium}")

    premium = pricing_data["premium"]
    logger.info(f"Premium: ₹{premium}")

    # ── Step 4.5: Derive zone_state ──────────────────────────────────────────
    zone_state = get_zone_state(features.civic_alert, Lf)
    logger.info(f"Zone State calculated: {zone_state}")

    # ── Step 5: Return full pipeline result (and cache it) ────────────────────
    result = PipelineResponse(
        h3_cell=h3_cell,
        latitude=features.latitude,
        longitude=features.longitude,
        # Environment
        rainfall=features.rainfall,
        temperature=features.temperature,
        aqi=features.aqi,
        demand_ratio=features.demand_ratio,
        civic_alert=features.civic_alert,
        # Risk
        Lf=Lf,
        risk_level=risk_level,
        zone_state=zone_state,
        # Pricing
        Ew=request.Ew,
        Ct=request.Ct,
        premium=premium,
    )

    # Store in TTLCache
    set_cached(cache_key, result.model_dump())
    
    return result
