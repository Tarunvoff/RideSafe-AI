"""
routes/pipeline.py

POST /pipeline — Full end-to-end pipeline:
  GPS (lat, lng) → H3 → /features → /risk-score → /pricing → PipelineResponse
"""

from fastapi import APIRouter, HTTPException
from models.schemas import PipelineRequest, PipelineResponse
from services.pipeline_service import run_pipeline
import httpx

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post("", response_model=PipelineResponse)
async def pipeline_endpoint(request: PipelineRequest):
    """
    Full end-to-end insurance pipeline in a single API call.

    Flow:
      1. GPS (lat, lng) → H3 cell (resolution 8)
      2. H3 cell → Real-time feature vector (weather + AQI + demand + civic)
      3. Features → Loss Fraction Lf via XGBoost risk model
      4. Lf + earnings → Final premium via LightGBM pricing model

    Returns everything: environment signals, risk score, and calculated premium.
    """
    try:
        return await run_pipeline(request)
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="ML service (port 8000) is unreachable. Ensure the ml-insurance-service is running."
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"ML service returned an error: {e.response.status_code} — {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
