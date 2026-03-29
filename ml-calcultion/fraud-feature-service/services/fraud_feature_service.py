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

    # ── Step 2: Persist incoming event (fire-and-forget style) ────────────────
    # This keeps the history current for the NEXT request.
    # Note: we update storage BEFORE computing so that the current ping
    # counts towards consistency / device tracking immediately.
    store.record_gps_ping(req.user_id, req.lat, req.lng, req.timestamp)
    store.record_device(req.user_id, req.device_id, req.timestamp)
    store.record_zone_presence(h3_cell, req.user_id, req.timestamp)
    
    if req.claim_amount > 0:
        store.record_claim(req.user_id, req.claim_amount, req.timestamp)
        store.record_zone_claim(h3_cell)

    # Re-fetch updated records (post-mutation) for accurate feature computation
    user_record = store.get_user(req.user_id)
    device_record = store.get_device(req.device_id)
    zone_record = store.get_zone(h3_cell)

    # ── Step 3: Compute features (synchronous — pure in-memory, no I/O) ──────
    # run_in_executor adds thread-scheduling overhead with zero benefit for
    # dict-only operations. Running directly keeps latency in the <10ms range.
    identity_features = compute_identity_features(user_record, device_record, req.timestamp)
    location_features = compute_location_features(user_record, zone_record, req.lat, req.lng, req.timestamp)
    behavior_features = compute_behavior_features(user_record, zone_record, req.timestamp)


    # ── Step 4: Derive meta ───────────────────────────────────────────────────
    meta = MetaFeatures(h3_cell=h3_cell, timestamp=req.timestamp)

    # ── Step 5: Assemble response ─────────────────────────────────────────────
    return FraudFeatureResponse(
        identity=identity_features,
        location=location_features,
        behavior=behavior_features,
        meta=meta,
    )
