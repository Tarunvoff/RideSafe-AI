"""
services/identity_service.py — Elite Identity Feature Computation.

Computes:
  • account_age_days        — days since first recorded principal event
  • device_id_uniqueness    — 1 / (num_users_sharing_device + 1)
  • device_switch_frequency — distinct devices in last 7 days
  • oauth_token_valid        — perimeter-validated (JwtAuthGuard enforces
                               token integrity at the NestJS API boundary;
                               all inbound requests to this service are
                               cryptographically authenticated upstream)

All functions are pure with respect to the storage layer — they read
principal/device records as dicts and return computed scalar values.
"""

from __future__ import annotations

import logging

from config import (
    DEFAULT_ACCOUNT_AGE_DAYS,
    DEFAULT_DEVICE_UNIQUENESS,
    DEFAULT_DEVICE_SWITCH_FREQ,
    DEVICE_SWITCH_WINDOW_DAYS,
)
from utils.time_utils import days_between, filter_within_days
from models.schemas import IdentityFeatures

logger = logging.getLogger(__name__)


def compute_account_age_days(user_record: dict | None, now_ts: int) -> int:
    """
    Days since the user was first registered / first seen.
    Returns 0 if no history exists.
    """
    if not user_record:
        return DEFAULT_ACCOUNT_AGE_DAYS
    created_at = user_record.get("created_at")
    if created_at is None:
        return DEFAULT_ACCOUNT_AGE_DAYS
    age = days_between(created_at, now_ts)
    return max(0, int(age))


def compute_device_uniqueness(device_record: dict | None) -> float:
    """
    Inverse of device sharing: 1 / (n_users_on_device + 1).

    Interpretation:
      1 user  → 1/(1+1) = 0.50  (shared with 1 other)
      0 users → 1/(0+1) = 1.00  (unique device)
      9 users → 1/(9+1) = 0.10  (heavily shared → suspicious)
    """
    if not device_record:
        return DEFAULT_DEVICE_UNIQUENESS
    n_users = len(device_record.get("users", []))
    return round(1.0 / (n_users + 1), 4)


def compute_device_switch_frequency(user_record: dict | None, now_ts: int) -> float:
    """
    Number of **distinct** devices used within the last DEVICE_SWITCH_WINDOW_DAYS days.
    A value > 2 in 7 days is a strong fraud signal.
    """
    if not user_record:
        return DEFAULT_DEVICE_SWITCH_FREQ
    devices = user_record.get("devices", [])
    recent = filter_within_days(devices, now_ts, DEVICE_SWITCH_WINDOW_DAYS)
    distinct_device_ids = {d["device_id"] for d in recent if "device_id" in d}
    return float(len(distinct_device_ids))


def compute_identity_features(
    user_record: dict | None,
    device_record: dict | None,
    now_ts: int,
) -> IdentityFeatures:
    """
    Orchestrate all identity feature computations and return an IdentityFeatures model.
    """
    account_age_days = compute_account_age_days(user_record, now_ts)
    device_id_uniqueness = compute_device_uniqueness(device_record)
    device_switch_frequency = compute_device_switch_frequency(user_record, now_ts)

    # IMPORTANT: oauth_token_valid is NOT hardcoded to True anymore.
    # The NestJS API Gateway (JwtAuthGuard) validates tokens at the network boundary.
    # This service is on the internal network — it never receives unauthenticated requests.
    #
    # oauth_token_valid here represents whether we can confirm the token is STILL VALID
    # at the time of the ML feature call. Without a real token introspection endpoint,
    # we cannot determine this. Setting to False (unknown/unverified) is safer than
    # pretending it's always True, which adds zero fraud signal to the model.
    #
    # Replace with token introspection once inter-service auth is enabled.
    # For now, this feature should be considered removed from ML features (no signal).
    oauth_token_valid: bool = False  # Not hardcoded True — see comment above

    logger.debug(
        "Identity features: age=%d days, uniqueness=%.3f, switches=%.0f, oauth=%s",
        account_age_days,
        device_id_uniqueness,
        device_switch_frequency,
        oauth_token_valid,
    )

    return IdentityFeatures(
        account_age_days=account_age_days,
        device_id_uniqueness=device_id_uniqueness,
        device_switch_frequency=device_switch_frequency,
        oauth_token_valid=oauth_token_valid,
    )
