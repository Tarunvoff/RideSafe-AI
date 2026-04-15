from fastapi import APIRouter
from models.schemas import (
    FraudHybridScoreRequest,
    FraudHybridScoreResponse,
    FraudScoreRequest,
    FraudScoreResponse,
)
from services.fraud_service import calculate_fraud_score, calculate_hybrid_fraud_score

router = APIRouter()

@router.post("/fraud-score", response_model=FraudScoreResponse)
def get_fraud_score(request: FraudScoreRequest):
    return calculate_fraud_score(request)


@router.post("/fraud/score", response_model=FraudHybridScoreResponse)
def get_hybrid_fraud_score(request: FraudHybridScoreRequest):
    return calculate_hybrid_fraud_score(request)
