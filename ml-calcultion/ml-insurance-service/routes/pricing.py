from fastapi import APIRouter
from models.schemas import PricingRequest, PricingResponse
from services.pricing_service import calculate_premium

router = APIRouter()

@router.post("/pricing", response_model=PricingResponse)
def get_pricing(request: PricingRequest):
    return calculate_premium(request)
