import os
import json
import logging
import time
import uuid
from models.schemas import TriggerRequest, TriggerResponse
from config import TRIGGER_LF_THRESHOLD, TRIGGER_FRAUD_THRESHOLD, TRIGGER_ZONE_HALT_STATE

logger = logging.getLogger(__name__)

# Expected Redis zone schema keys — used for validation
_REQUIRED_ZONE_FIELDS = {"Lf", "zone_state", "source", "timestamp"}

# Redis initialization for state store
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis  # type: ignore
            redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
            _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
            logger.info("trigger_service connected to Redis at %s", redis_url)
        except Exception as exc:
            logger.error("Redis connection failed: %s", exc)
            _redis_client = None
    return _redis_client


def get_zone_state(h3_cell: str) -> dict:
    """
    Read zone state from Redis — the ONLY source of truth.
    Validates schema fields; logs a warning if source is not 'h3-feature-service'.
    Returns {} if Redis is unavailable or key is missing (→ safe defaults downstream).
    """
    redis = get_redis()
    if redis is None:
        return {}
    try:
        raw = redis.get(f"zone:{h3_cell}")
    except Exception as exc:
        logger.error("Redis GET failed for zone:%s: %s", h3_cell, exc)
        return {}

    if not raw:
        return {}

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Corrupt Redis zone data for %s: %s", h3_cell, exc)
        return {}

    # [SC] Schema validation — log warnings for missing/unexpected provenance
    missing = _REQUIRED_ZONE_FIELDS - set(data.keys())
    if missing:
        logger.warning(
            "zone:%s is missing schema fields: %s — data may be stale or from wrong source",
            h3_cell, missing
        )

    source = data.get("source", "unknown")
    if source != "h3-feature-service":
        logger.warning(
            "zone:%s source='%s' — expected 'h3-feature-service'. Split-brain risk!",
            h3_cell, source
        )

    # Validate Lf bounds
    lf = data.get("Lf") or data.get("lf_score", 0.0)
    if not (0.0 <= float(lf) <= 1.0):
        logger.warning("zone:%s Lf=%.4f out of [0,1] — clamping", h3_cell, lf)
        data["Lf"]      = max(0.0, min(1.0, float(lf)))
        data["lf_score"] = data["Lf"]

    # Validate staleness (warn if zone data is older than 2× TTL)
    ts = data.get("timestamp", 0.0)
    age = time.time() - float(ts)
    ttl = int(os.getenv("ZONE_KEY_TTL_SECONDS", "300"))
    if age > ttl * 2:
        logger.warning("zone:%s is stale (age=%.0fs > 2×TTL=%ds)", h3_cell, age, ttl)

    return data


def evaluate_trigger(request: TriggerRequest) -> TriggerResponse:
    """
    Parametric Trigger Logic — reads EXCLUSIVELY from Redis (never recomputes):
      IF zone_state == HALTED
      AND Lf > TRIGGER_LF_THRESHOLD (0.7)
      AND fraud_score < TRIGGER_FRAUD_THRESHOLD (0.7)
      → APPROVED
      Else → HOLD / MANUAL REVIEW

    trace_id is generated per-evaluation for end-to-end log correlation.
    """
    trace_id = str(uuid.uuid4())[:8]
    decision = "HOLD / MANUAL REVIEW"

    # [SSoT] Fetch real-time state from Redis — ONLY source of truth
    zone_data  = get_zone_state(request.h3_cell)
    zone_state = zone_data.get("zone_state", "NORMAL")
    Lf         = float(zone_data.get("Lf") or zone_data.get("lf_score", 0.0))

    # [SC] Sanity: ensure zone_state matches Lf (detect any split-brain survivors)
    # Re-derive expected from Lf (no civic_alert context here)
    if Lf > 0.75 and zone_state not in ("HALTED", "DANGEROUS"):
        logger.warning(
            "[tid=%s] zone:%s state=%s inconsistent with Lf=%.4f — overriding to HALTED",
            trace_id, request.h3_cell, zone_state, Lf
        )
        zone_state = "HALTED"

    if zone_state.upper() == TRIGGER_ZONE_HALT_STATE:
        if Lf > TRIGGER_LF_THRESHOLD and request.fraud_score < TRIGGER_FRAUD_THRESHOLD:
            decision = "APPROVED"

    logger.info(
        "[tid=%s] TRIGGER h3=%s zone=%s Lf=%.4f fraud=%.3f → %s",
        trace_id, request.h3_cell, zone_state, Lf, request.fraud_score, decision
    )

    return TriggerResponse(decision=decision, Lf=Lf, zone_state=zone_state)
