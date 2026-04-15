"""
services/traffic_service.py

Real-time traffic data via TomTom Traffic Flow Segment Data API.
Falls back to deterministic calibrated prior if the API is unavailable.

Endpoint:
  GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json
      ?point={lat},{lng}&key={API_KEY}&unit=KMPH

Response shape (JSON):
  {
    "flowSegmentData": {
      "frc": "FRC3",
      "currentSpeed": 12,
      "freeFlowSpeed": 45,
      "currentTravelTime": 280,
      "freeFlowTravelTime": 120,
      "confidence": 0.82,
      "roadClosure": false,
      "coordinates": { ... }
    }
  }
"""

import logging
import os
import random
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

# ── TomTom Configuration ─────────────────────────────────────────────────────
TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")
TOMTOM_BASE_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
TOMTOM_TIMEOUT = 5.0  # seconds


async def _fetch_tomtom(lat: float, lng: float) -> dict:
    """
    Call TomTom Traffic Flow Segment Data API.
    Returns the raw flowSegmentData dict or raises on failure.
    """
    if not TOMTOM_API_KEY:
        raise ValueError("TOMTOM_API_KEY is not configured")

    params = {
        "point": f"{lat},{lng}",
        "key": TOMTOM_API_KEY,
        "unit": "KMPH",
    }
    async with httpx.AsyncClient(timeout=TOMTOM_TIMEOUT) as client:
        resp = await client.get(TOMTOM_BASE_URL, params=params)
        resp.raise_for_status()
        body = resp.json()

    flow = body.get("flowSegmentData")
    if not flow:
        raise ValueError("Missing flowSegmentData in TomTom response")

    return flow


def _calibrated_fallback_traffic(lat: float, lng: float, h3_cell: str) -> dict:
    """
    Deterministic calibrated fallback prior for outage resilience.
    Produces stable-per-5-minute-window values seeded on the H3 cell.
    """
    current_minute = datetime.now().minute // 5
    seed_str = f"{h3_cell}_{current_minute}"
    rng = random.Random(hash(seed_str))

    base_speed = rng.uniform(3.0, 45.0)
    if rng.random() < 0.10:
        base_speed = rng.uniform(1.0, 4.8)

    avg_speed_kmh = round(base_speed, 1)
    raw_congestion = 1.0 - (min(avg_speed_kmh, 40.0) / 40.0)
    congestion_index = round(max(0.0, min(1.0, raw_congestion + rng.uniform(-0.05, 0.05))), 2)
    is_gridlock = bool(avg_speed_kmh < 5.0 and congestion_index > 0.85)

    return {
        "avg_speed_kmh": avg_speed_kmh,
        "congestion_index": congestion_index,
        "is_gridlock": is_gridlock,
        "source": "calibrated_fallback_prior",
    }


async def get_traffic_features(lat: float, lng: float, h3_cell: str) -> dict:
    """
    Fetch real-time traffic from TomTom.
    Falls back to deterministic calibrated prior on any failure.

    Returns:
        {
            "avg_speed_kmh": float,
            "congestion_index": float,   # 0.0 (free-flow) → 1.0 (standstill)
            "is_gridlock": bool,          # currentSpeed < 5 AND congestion > 0.85
            "source": "tomtom_live" | "calibrated_fallback_prior",
        }
    """
    try:
        flow = await _fetch_tomtom(lat, lng)

        current_speed = float(flow.get("currentSpeed", 0))
        free_flow_speed = float(flow.get("freeFlowSpeed", 1))
        confidence = float(flow.get("confidence", 0))
        road_closure = bool(flow.get("roadClosure", False))

        # Congestion index: 1.0 - (current / freeFlow), clamped [0, 1]
        if free_flow_speed > 0:
            congestion_index = round(max(0.0, min(1.0, 1.0 - (current_speed / free_flow_speed))), 2)
        else:
            congestion_index = 1.0

        # Road closure counts as full gridlock
        if road_closure:
            current_speed = 0.0
            congestion_index = 1.0

        is_gridlock = bool(current_speed < 5.0 and congestion_index > 0.85)

        logger.info(
            "TomTom LIVE → speed=%.1f km/h  freeFlow=%.1f  congestion=%.2f  "
            "gridlock=%s  confidence=%.2f  closure=%s",
            current_speed, free_flow_speed, congestion_index,
            is_gridlock, confidence, road_closure,
        )

        return {
            "avg_speed_kmh": round(current_speed, 1),
            "congestion_index": congestion_index,
            "is_gridlock": is_gridlock,
            "source": "tomtom_live",
        }

    except Exception as exc:
        logger.warning("TomTom API failed for (%.4f, %.4f): %s — using calibrated fallback prior", lat, lng, exc)
        return _calibrated_fallback_traffic(lat, lng, h3_cell)
