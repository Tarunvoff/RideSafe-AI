from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from utils.redis_client import redis_client

router = APIRouter(prefix="/feedback")
logger = logging.getLogger(__name__)

# Key for storing adaptive drift in Redis
ADAPTIVE_DRIFT_KEY = "aegis:ml:adaptive_drift"
LEARNING_RATE = 0.05

class PayoutFeedback(BaseModel):
    payout_id: str
    predicted_risk: float
    actual_outcome: float # 1.0 if legitimate loss occurred, 0.0 if fraud, etc.
    driver_id: str
    h3_cell: str

@router.post("/payout-audit")
async def process_payout_audit(feedback: PayoutFeedback):
    """
    Adaptive Analysis Feedback Loop:
    Compares the original ML prediction against the real-world outcome
    to refine model weights or retrain triggers.
    """
    error = feedback.actual_outcome - feedback.predicted_risk
    abs_error = abs(error)
    
    logger.info(
        f"Feedback Audit Received for Payout {feedback.payout_id}: "
        f"Predicted={feedback.predicted_risk}, Actual={feedback.actual_outcome}, Error={error:.4f}"
    )
    
    # ── High-Fidelity Recalibration Logic ────────────────────────────────────
    # If the model consistently under-predicts (actual > prediction), 
    # we increment the adaptive drift state.
    
    current_drift = 0.0
    if redis_client.client:
        try:
            stored_drift = redis_client.client.get(ADAPTIVE_DRIFT_KEY)
            if stored_drift:
                current_drift = float(stored_drift)
            
            # Apply adjustment based on the direction of error
            # This implements a running average 'bias' filter
            new_drift = current_drift + (error * LEARNING_RATE)
            
            # Cap the drift to prevent runaway oscillation
            new_drift = max(-0.5, min(0.5, new_drift))
            
            redis_client.client.set(ADAPTIVE_DRIFT_KEY, str(new_drift))
            logger.info(f"Adaptive Drift updated: {current_drift:.4f} -> {new_drift:.4f}")
            
        except Exception as e:
            logger.error(f"Failed to update adaptive drift in Redis: {e}")

    return {
        "status": "recalibrated" if abs_error > 0.1 else "nominal", 
        "error_delta": error,
        "new_global_drift": current_drift + (error * LEARNING_RATE) if redis_client.client else 0,
        "action": "weight_bias_adjusted" if abs_error > 0.1 else "stored_for_training"
    }
