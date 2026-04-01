"""
routes/risk.py — Risk Score REST Endpoint

Task 2 Implementation:
  GET /api/v1/risk/:userId
    → Evaluates risk score from the user's stored telemetry history.
    → Returns the standard JSON API envelope:
        { "success": true, "data": { ... } }
        { "success": false, "error": { "code": "...", "message": "..." } }

Contract (Dev Spec Section A):
  Response envelope: { success: bool, data: <payload>, meta: {} }
  Error envelope:    { success: false, error: { code: str, message: str, details: {} } }
"""

import logging
import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from storage import store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Risk"])


# ── Response shapes ────────────────────────────────────────────────────────────

class RiskScoreData(BaseModel):
    user_id: str
    risk_score: float                # 0.0 (clean) → 1.0 (high risk)
    risk_label: str                  # "LOW" | "MEDIUM" | "HIGH"
    account_age_days: int
    claims_last_30d: int
    distinct_devices_7d: int
    device_high_share: bool
    evaluated_at: int                # unix epoch


def _ok(data: dict, meta: dict | None = None) -> dict:
    return {"success": True, "data": data, "meta": meta or {}}


def _err(code: str, message: str, status: int = 400, details: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "success": False,
            "error": {"code": code, "message": message, "details": details or {}},
        },
    )


# ── Scoring logic (deterministic rules from telemetry history) ─────────────────

def _compute_risk(user_record: dict, now_ts: int) -> tuple[float, str, dict]:
    """
    Pure-function risk scorer from raw user history.
    Returns (score, label, breakdown).

    Signals:
      - account_age_days < 7 → +0.25 (new account)
      - claims_last_30d  > 5 → +0.30 (high claim velocity)
      - distinct_devices > 2 → +0.25 (device switching)
      - device_high_share    → +0.20 (shared device)
    Score is capped at 1.0.
    """
    score = 0.0

    # ── Account age ────────────────────────────────────────────────────────────
    created_at = user_record.get("created_at", now_ts)
    age_days = max(0, int((now_ts - created_at) / 86400))
    if age_days < 7:
        score += 0.25

    # ── Claims last 30 days ────────────────────────────────────────────────────
    cutoff_30d = now_ts - 30 * 86400
    claims = [c for c in user_record.get("claims", []) if c.get("timestamp", 0) >= cutoff_30d]
    claims_last_30d = len(claims)
    if claims_last_30d > 5:
        score += 0.30
    elif claims_last_30d > 2:
        score += 0.15

    # ── Device switching (last 7 days) ─────────────────────────────────────────
    cutoff_7d = now_ts - 7 * 86400
    recent_devices = {
        d["device_id"]
        for d in user_record.get("devices", [])
        if d.get("timestamp", 0) >= cutoff_7d and "device_id" in d
    }
    distinct_devices = len(recent_devices)
    if distinct_devices > 2:
        score += 0.25

    # ── Device high-share flag ─────────────────────────────────────────────────
    # Derive from the latest device entry
    devices_list = user_record.get("devices", [])
    latest_device_id = devices_list[-1]["device_id"] if devices_list else None
    device_high_share = False
    if latest_device_id:
        dev_record = store.get_device(latest_device_id)
        device_high_share = bool(dev_record and dev_record.get("high_share", False))
    if device_high_share:
        score += 0.20

    score = round(min(score, 1.0), 4)

    if score >= 0.7:
        label = "HIGH"
    elif score >= 0.35:
        label = "MEDIUM"
    else:
        label = "LOW"

    breakdown = {
        "account_age_days": age_days,
        "claims_last_30d": claims_last_30d,
        "distinct_devices_7d": distinct_devices,
        "device_high_share": device_high_share,
    }
    return score, label, breakdown


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.get(
    "/risk/{user_id}",
    summary="Get Risk Score for a User",
    description=(
        "Evaluates and returns a deterministic risk score derived from the user's "
        "stored telemetry and claim history. Returns the standard API envelope "
        "{ success, data } on success, or { success, error } on failure."
    ),
)
async def get_risk_score(user_id: str):
    if not user_id or len(user_id.strip()) == 0:
        return _err(
            code="ERR_AUTH_INVALID_TOKEN",
            message="user_id must be a non-empty string.",
            status=400,
        )

    user_record = store.get_user(user_id)
    if user_record is None:
        return _err(
            code="ERR_DB_QUERY_FAILED",
            message=f"No telemetry history found for user '{user_id}'.",
            status=404,
        )

    try:
        now_ts = int(time.time())
        score, label, breakdown = _compute_risk(user_record, now_ts)

        data = RiskScoreData(
            user_id=user_id,
            risk_score=score,
            risk_label=label,
            account_age_days=breakdown["account_age_days"],
            claims_last_30d=breakdown["claims_last_30d"],
            distinct_devices_7d=breakdown["distinct_devices_7d"],
            device_high_share=breakdown["device_high_share"],
            evaluated_at=now_ts,
        )
        return _ok(data=data.model_dump())

    except Exception as exc:
        logger.exception("Risk evaluation failed for user %s: %s", user_id, exc)
        return _err(
            code="ERR_DB_QUERY_FAILED",
            message="Internal error during risk computation.",
            status=500,
            details={"exception": str(exc)},
        )
