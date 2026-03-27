from fastapi import APIRouter
from models.schemas import FraudScoreRequest, FraudScoreResponse
from services.fraud_service import calculate_fraud_score

router = APIRouter()

@router.post("/fraud-score", response_model=FraudScoreResponse)
def get_fraud_score(request: FraudScoreRequest):
    return calculate_fraud_score(request)
