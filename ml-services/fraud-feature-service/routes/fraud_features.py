"""
routes/fraud_features.py

POST /fraud-features   → Extract full fraud feature vector
GET  /fraud-features/user/{user_id}  → Inspect stored user record (debug)
"""

import logging

from fastapi import APIRouter, HTTPException
from models.schemas import FraudFeatureRequest, FraudFeatureResponse
from services.fraud_feature_service import extract_fraud_features
from storage import store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud-features", tags=["Fraud Features"])


@router.post(
    "",
    response_model=FraudFeatureResponse,
    summary="Extract Fraud Feature Vector",
    description=(
        "Accepts a rider event payload (GPS, device, UPI, claim), computes identity / "
        "location / behaviour feature vectors from stored history, and returns a "
        "structured output ready for the Rule Engine and ML Fraud Scoring model."
    ),
)
async def fraud_features_endpoint(request: FraudFeatureRequest) -> FraudFeatureResponse:
    """
    Main fraud feature extraction endpoint.

    Pipeline:
      Input validation → load history → record event → parallel feature computation → return
    """
    return await extract_fraud_features(request)


@router.get(
    "/user/{user_id}",
    summary="Inspect User History (Debug)",
    description=(
        "Returns the raw user record from the store. "
        "Useful during development and integration testing. "
        "Disable or gate behind auth in production."
    ),
)
async def get_user_record(user_id: str):
    """Return the raw stored user record for inspection."""
    record = store.get_user(user_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No record found for user '{user_id}'")
    return {"user_id": user_id, "record": record}


@router.get(
    "/device/{device_id}",
    summary="Inspect Device History (Debug)",
    description="Returns the raw device record (list of users) from the store.",
)
async def get_device_record(device_id: str):
    """Return the raw stored device record for inspection."""
    record = store.get_device(device_id)
    if record is None:
        raise HTTPException(
            status_code=404, detail=f"No record found for device '{device_id}'"
        )
    return {"device_id": device_id, "record": record}
