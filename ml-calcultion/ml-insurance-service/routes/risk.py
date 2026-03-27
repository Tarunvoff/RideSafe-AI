from fastapi import APIRouter
from models.schemas import RiskScoreRequest, RiskScoreResponse
from services.risk_service import calculate_risk_score

router = APIRouter()

@router.post("/risk-score", response_model=RiskScoreResponse)
def get_risk_score(request: RiskScoreRequest):
    return calculate_risk_score(request)
