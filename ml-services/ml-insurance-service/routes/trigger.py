from fastapi import APIRouter
from models.schemas import TriggerRequest, TriggerResponse
from services.trigger_service import evaluate_trigger

router = APIRouter()

@router.post("/trigger", response_model=TriggerResponse)
def get_trigger(request: TriggerRequest):
    """
    ── Parametric Disruption Trigger Logic ───────────────────────────────────────
    
    Evaluates whether a specific H3 cell has met the threshold for a 
    "Trigger Event" (e.g., Grid Halt, Severe Disruption).
    
    For comprehensive architectural details, refer to:
    - ARCHITECTURE/ML_MODEL_CARDS.md (Trigger Model Card)
    """
    return evaluate_trigger(request)
