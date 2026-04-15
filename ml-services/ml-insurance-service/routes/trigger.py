from fastapi import APIRouter
from models.schemas import TriggerRequest, TriggerResponse
from services.trigger_service import evaluate_trigger

router = APIRouter()

@router.post("/trigger", response_model=TriggerResponse)
def get_trigger(request: TriggerRequest):
    return evaluate_trigger(request)
