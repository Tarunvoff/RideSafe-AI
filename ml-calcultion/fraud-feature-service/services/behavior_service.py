"""
services/behavior_service.py — Behavioural feature computation.

Computes:
  • claims_last_30d             — absolute count of claims in rolling 30-day window
  • trigger_frequency           — claims per active day (active = days with GPS pings)
  • earnings_pattern_deviation  — normalised std deviation of earnings vs mean
  • zone_claim_rate             — ratio of claims to active users in this H3 cell

Safe defaults are returned for any user with no historical data.
"""

from __future__ import annotations

import math
import logging

from config import (
    CLAIMS_WINDOW_DAYS,
    DEFAULT_CLAIMS_LAST_30D,
    DEFAULT_TRIGGER_FREQUENCY,
    DEFAULT_EARNINGS_DEVIATION,
)
from utils.time_utils import filter_within_days
from models.schemas import BehaviorFeatures

logger = logging.getLogger(__name__)


def compute_claims_last_30d(user_record: dict | None, now_ts: int) -> int:
    """Count claims submitted within the last CLAIMS_WINDOW_DAYS days."""
    if not user_record:
        return DEFAULT_CLAIMS_LAST_30D
    claims = user_record.get("claims", [])
    recent = filter_within_days(claims, now_ts, CLAIMS_WINDOW_DAYS)
    return len(recent)


def compute_trigger_frequency(
    user_record: dict | None,
    claims_last_30d: int,
    now_ts: int,
) -> float:
    """
    Claims per active day.

    active_days = number of distinct calendar days with at least one GPS ping
    in the last 30 days. If no GPS data, falls back to claim_days.

    Formula: claims_last_30d / max(active_days, 1)
    """
    if not user_record or claims_last_30d == 0:
        return DEFAULT_TRIGGER_FREQUENCY

    gps_history = user_record.get("gps_history", [])
    recent_gps = filter_within_days(gps_history, now_ts, CLAIMS_WINDOW_DAYS)

    # Count distinct days (UTC) with at least one GPS ping
    active_day_set: set[int] = set()
    for ping in recent_gps:
        ts = ping.get("timestamp")
        if ts is not None:
            active_day_set.add(ts // 86400)

    # Fallback: if no GPS, count distinct claim days as proxy for active days
    if not active_day_set:
        claims = user_record.get("claims", [])
        recent_claims = filter_within_days(claims, now_ts, CLAIMS_WINDOW_DAYS)
        for claim in recent_claims:
            ts = claim.get("timestamp")
            if ts is not None:
                active_day_set.add(ts // 86400)

    active_days = max(len(active_day_set), 1)
    return round(claims_last_30d / active_days, 4)


def compute_earnings_deviation(user_record: dict | None) -> float:
    """
    Normalised standard deviation of historical earnings.

    Formula: std(earnings) / mean(earnings)   → 0 if mean == 0 or < 2 samples.

    Interpretation:
      0.0 → perfectly consistent earner
      1.0 → std equals mean (very erratic)
      > 1.0 → earnings have wild swings (suspicious for structured fraud)
    """
    if not user_record:
        return DEFAULT_EARNINGS_DEVIATION

    earnings: list[float] = user_record.get("earnings", [])
    if len(earnings) < 2:
        return DEFAULT_EARNINGS_DEVIATION

    mean_e = sum(earnings) / len(earnings)
    if mean_e == 0:
        return DEFAULT_EARNINGS_DEVIATION

    variance = sum((e - mean_e) ** 2 for e in earnings) / len(earnings)
    std_e = math.sqrt(variance)

    # Normalised: coeff of variation, clamped to [0, 2] for ML safety
    deviation = min(round(std_e / mean_e, 4), 2.0)
    return deviation


def compute_zone_claim_rate(zone_record: dict | None) -> float:
    """
    Ratio of claims to active users in this H3 cell.
    High spikes indicate cluster fraud or claim density anomaly.
    """
    if not zone_record:
        return 0.0
    
    active_riders = zone_record.get("active_riders", 1)
    # prevent div by zero
    active_riders = max(1, active_riders)
    claim_count = zone_record.get("claim_count", 0)
    
    return round(claim_count / active_riders, 4)

def compute_behavior_features(
    user_record: dict | None,
    zone_record: dict | None,
    now_ts: int,
) -> BehaviorFeatures:
    """
    Orchestrate all behavioural feature computations and return a BehaviorFeatures model.
    """
    claims_last_30d = compute_claims_last_30d(user_record, now_ts)
    trigger_frequency = compute_trigger_frequency(user_record, claims_last_30d, now_ts)
    earnings_pattern_deviation = compute_earnings_deviation(user_record)
    zone_claim_rate = compute_zone_claim_rate(zone_record)

    logger.debug(
        "Behavior features: claims_30d=%d, trigger_freq=%.4f, earnings_dev=%.4f, zone_claim_rate=%.4f",
        claims_last_30d,
        trigger_frequency,
        earnings_pattern_deviation,
        zone_claim_rate
    )

    return BehaviorFeatures(
        claims_last_30d=claims_last_30d,
        trigger_frequency=trigger_frequency,
        earnings_pattern_deviation=earnings_pattern_deviation,
        zone_claim_rate=zone_claim_rate
    )
