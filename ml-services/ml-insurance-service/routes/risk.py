from fastapi import APIRouter
from models.schemas import (
    RiskModelScoreRequest,
    RiskModelScoreResponse,
    RiskScoreRequest,
    RiskScoreResponse,
)
from services.risk_service import calculate_risk_score, score_risk_model

router = APIRouter()

@router.post("/risk-score", response_model=RiskScoreResponse)
def get_risk_score(request: RiskScoreRequest):
    return calculate_risk_score(request)


@router.post("/risk/score", response_model=RiskModelScoreResponse)
def get_live_risk_score(request: RiskModelScoreRequest):
    return score_risk_model(request)
