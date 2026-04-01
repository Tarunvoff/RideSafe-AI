from pydantic import BaseModel, Field
from typing import Optional


# ── Request ───────────────────────────────────────────────────────────────────

class FraudFeatureRequest(BaseModel):
    """
    Inbound event payload from the NestJS orchestrator.
    One request per rider event (ZONE_HALTED, claim, etc.)
    """
    user_id: str = Field(..., example="u123", description="Rider user ID")
    device_id: str = Field(..., example="d456", description="Current device ID reported by app")
    upi_id: str = Field(..., example="upi789", description="Linked UPI / payment identity")
    lat: float = Field(..., example=12.9352, description="Current GPS latitude")
    lng: float = Field(..., example=77.6245, description="Current GPS longitude")
    timestamp: int = Field(..., example=1711530000, description="Unix epoch (seconds) of the event")
    claim_amount: float = Field(..., ge=0, example=800.0, description="Claimed amount in ₹")
    event_type: str = Field(..., example="ZONE_HALTED", description="Trigger event type")


# ── Sub-models (nested output) ────────────────────────────────────────────────

class IdentityFeatures(BaseModel):
    """Who is this user / device?"""
    account_age_days: int = Field(..., description="Days since first user event was recorded")
    device_id_uniqueness: float = Field(..., ge=0.0, le=1.0,
        description="Inverse of shared-device count: 1/(n_users + 1). Higher → more unique.")
    device_switch_frequency: float = Field(..., ge=0.0,
        description="Number of distinct devices used in last 7 days")
    oauth_token_valid: bool = Field(...,
        description="Whether the OAuth session token is valid (mocked true for now)")


class LocationFeatures(BaseModel):
    """Where is this user and how have they been moving?"""
    gps_speed: float = Field(..., ge=0.0,
        description="Estimated speed km/h derived from last two GPS pings")
    gps_cell_distance: float = Field(..., ge=0.0,
        description="Great-circle distance (km) between current and previous H3 cell centres")
    h3_zone_consistency: float = Field(..., ge=0.0, le=1.0,
        description="Fraction of GPS pings in the last 24 h that landed in the current H3 cell")
    has_history_in_zone: bool = Field(..., 
        description="True if user has previously appeared in this H3 cell")
    h3_burst_detected: bool = Field(...,
        description="True if an anomalous number of distinct users appeared in this cell concurrently")


class BehaviorFeatures(BaseModel):
    """How has this user behaved historically?"""
    claims_last_30d: int = Field(..., ge=0,
        description="Number of claims submitted by this user in the last 30 days")
    trigger_frequency: float = Field(..., ge=0.0,
        description="Claims per active day (claims_last_30d / active_days)")
    earnings_pattern_deviation: float = Field(..., ge=0.0,
        description="Normalised standard deviation of earnings vs historical mean")
    zone_claim_rate: float = Field(..., ge=0.0,
        description="Ratio of claims to active users in this H3 cell (historical)")


class MetaFeatures(BaseModel):
    """Request-level metadata and multi-layer fraud signals."""
    h3_cell: str = Field(..., description="H3 cell at resolution 8 for (lat, lng)")
    timestamp: int = Field(..., description="Echo of the incoming event timestamp")

    # ── Layer A: Device Intelligence ────────────────────────────────────────────
    device_high_share: bool = Field(
        False,
        description="True when >3 distinct users are registered on this device ID",
    )
    device_user_count: int = Field(
        0,
        description="Total distinct users seen on this device",
    )

    # ── Layer B: H3 Burst Detection ─────────────────────────────────────────────
    h3_burst_detected: bool = Field(
        False,
        description="True when multiple users are active in the same H3 cell within 1 hour",
    )
    h3_active_count: int = Field(
        0,
        description="Count of distinct users active in this H3 cell right now",
    )

    # ── Layer C: Temporal Behavior ───────────────────────────────────────────────
    claims_last_24h: int = Field(
        0,
        description="Number of claims submitted by this user in the last 24 hours",
    )


# ── Response ──────────────────────────────────────────────────────────────────

class FraudFeatureResponse(BaseModel):
    """
    Complete fraud feature vector.
    Passed as-is to: Rule Engine → ML Fraud Scoring.
    Do NOT add fraud decisions or ML scores here.
    """
    identity: IdentityFeatures
    location: LocationFeatures
    behavior: BehaviorFeatures
    meta: MetaFeatures
