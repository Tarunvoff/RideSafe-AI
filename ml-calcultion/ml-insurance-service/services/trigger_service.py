from models.schemas import TriggerRequest, TriggerResponse
from config import TRIGGER_LF_THRESHOLD, TRIGGER_FRAUD_THRESHOLD, TRIGGER_ZONE_HALT_STATE


def evaluate_trigger(request: TriggerRequest) -> TriggerResponse:
    """
    Parametric Trigger Logic:
      IF zone_state == HALTED
      AND Lf > TRIGGER_LF_THRESHOLD (0.7)
      AND fraud_score < TRIGGER_FRAUD_THRESHOLD (0.7)
      → APPROVED
      Else → HOLD / MANUAL REVIEW
    """
    decision = "HOLD / MANUAL REVIEW"

    if request.zone_state.upper() == TRIGGER_ZONE_HALT_STATE:
        if request.Lf > TRIGGER_LF_THRESHOLD and request.fraud_score < TRIGGER_FRAUD_THRESHOLD:
            decision = "APPROVED"

    return TriggerResponse(decision=decision)
