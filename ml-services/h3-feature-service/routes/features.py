"""
routes/features.py

POST /features  → Full H3 feature pipeline
GET  /features/cache-stats → Monitor cache health
"""

from fastapi import APIRouter
from models.schemas import FeatureRequest, FeatureResponse
from services.feature_service import get_features
from cache.store import get_cache_stats

router = APIRouter(prefix="/features", tags=["Features"])


@router.post("", response_model=FeatureResponse)
async def features_endpoint(request: FeatureRequest):
    """
    Convert an H3 cell ID into a normalized ML feature vector.

    Pipeline:
      H3 cell → lat/lng → [weather + AQI in parallel] → features → cache → return

    Cached for 10 minutes per cell. Returns safe defaults on API failure.
    """
    return await get_features(request.h3_cell)


@router.get("/cache-stats")
async def cache_stats():
    """
    Returns current cache utilization metrics.
    Useful for Grafana / monitoring dashboards.
    """
    return get_cache_stats()
