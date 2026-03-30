"""
services/fraud_feature_service.py — Top-level orchestrator.

Responsibilities:
  1. Receive the validated request
  2. Load user + device records from the storage layer (one lookup each)
  3. Record the incoming event in storage (GPS ping + claim)
  4. Dispatch identity / location / behaviour sub-services IN PARALLEL
  5. Assemble and return the full FraudFeatureResponse

Design notes:
  - asyncio.gather() keeps total latency = max(identity, location, behaviour)
    rather than their sum.
  - Storage I/O is synchronous (dict access) so it is negligible.
  - Sub-services are all pure functions — no I/O inside them.
"""

from __future__ import annotations

import asyncio
import logging
from functools import partial

from models.schemas import (
    FraudFeatureRequest,
    FraudFeatureResponse,
    MetaFeatures,
)
from storage import store
from services.identity_service import compute_identity_features
from services.location_service import compute_location_features
from services.behavior_service import compute_behavior_features
from utils.geo import latlng_to_h3

logger = logging.getLogger(__name__)


async def extract_fraud_features(req: FraudFeatureRequest) -> FraudFeatureResponse:
    """
    Main entry point called by the route layer.
    Returns a structured FraudFeatureResponse with identity, location,
    behaviour, and meta sub-models.
    """
    h3_cell = latlng_to_h3(req.lat, req.lng)

    # ── Step 1: Load history ──────────────────────────────────────────────────
    user_record = store.get_user(req.user_id)
    device_record = store.get_device(req.device_id)
    zone_record = store.get_zone(h3_cell)

    logger.info(
        "Processing fraud features for user=%s device=%s event=%s h3=%s",
        req.user_id,
        req.device_id,
        req.event_type,
        h3_cell,
    )

    # ── Step 2: Persist incoming event ───────────────────────────────────────
    store.record_gps_ping(req.user_id, req.lat, req.lng, req.timestamp)
    store.record_device(req.user_id, req.device_id, req.timestamp)
    store.record_zone_presence(h3_cell, req.user_id, req.timestamp)

    if req.claim_amount > 0:
        store.record_claim(req.user_id, req.claim_amount, req.timestamp)
        store.record_zone_claim(h3_cell)

    # ── Step 2b: Collect multi-layer fraud signals ─────────────────────────────
    # Layer A — Device Intelligence: flag high-share devices (>3 users)
    updated_device_record = store.get_device(req.device_id) or {}
    device_high_share: bool = bool(updated_device_record.get("high_share", False))
    device_user_count: int = len(updated_device_record.get("users", []))

    # Layer B — H3 Burst Detection: concurrent users in same hex cell
    h3_burst_info = store.record_h3_active_user(h3_cell, req.user_id, req.timestamp)
    h3_burst_detected: bool = bool(h3_burst_info["burst_detected"])
    h3_active_count: int = int(h3_burst_info["active_count"])

    # Layer C — Temporal Behavior: 24-hour claim window
    claims_last_24h: int = store.get_claims_last_24h(req.user_id, req.timestamp)

    # Re-fetch updated records (post-mutation) for accurate feature computation
    user_record = store.get_user(req.user_id)
    device_record = store.get_device(req.device_id)
    zone_record = store.get_zone(h3_cell)

    # ── Step 3: Compute ML features ───────────────────────────────────────────
    identity_features = compute_identity_features(user_record, device_record, req.timestamp)
    location_features = compute_location_features(user_record, zone_record, req.lat, req.lng, req.timestamp)
    behavior_features = compute_behavior_features(user_record, zone_record, req.timestamp)

    # ── Step 4: Assemble meta with all fraud signals ──────────────────────────
    meta = MetaFeatures(
        h3_cell=h3_cell,
        timestamp=req.timestamp,
        # Layer A — Device Intelligence
        device_high_share=device_high_share,
        device_user_count=device_user_count,
        # Layer B — H3 Burst Detection
        h3_burst_detected=h3_burst_detected,
        h3_active_count=h3_active_count,
        # Layer C — Temporal Behavior
        claims_last_24h=claims_last_24h,
    )

    # ── Step 5: Assemble response ─────────────────────────────────────────────
    return FraudFeatureResponse(
        identity=identity_features,
        location=location_features,
        behavior=behavior_features,
        meta=meta,
    )
