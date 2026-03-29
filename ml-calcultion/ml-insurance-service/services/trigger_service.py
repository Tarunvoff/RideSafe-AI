import os
import json
import logging
from models.schemas import TriggerRequest, TriggerResponse
from config import TRIGGER_LF_THRESHOLD, TRIGGER_FRAUD_THRESHOLD, TRIGGER_ZONE_HALT_STATE

logger = logging.getLogger(__name__)

# Redis initialization for state store
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis  # type: ignore
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
        except Exception as exc:
            logger.error(f"Redis connection failed: {exc}")
            _redis_client = None
    return _redis_client

def get_zone_state(h3_cell: str) -> dict:
    redis = get_redis()
    if redis is None:
        return {}
    raw = redis.get(f"zone:{h3_cell}")
    if raw:
        return json.loads(raw)
    return {}

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

    # Fetch real-time state from Redis keyed by H3
    zone_data = get_zone_state(request.h3_cell)
    
    zone_state = zone_data.get("zone_state", "NORMAL")
    Lf = float(zone_data.get("lf_score", 0.0))

    if zone_state.upper() == TRIGGER_ZONE_HALT_STATE:
        if Lf > TRIGGER_LF_THRESHOLD and request.fraud_score < TRIGGER_FRAUD_THRESHOLD:
            decision = "APPROVED"

    return TriggerResponse(decision=decision, Lf=Lf, zone_state=zone_state)
