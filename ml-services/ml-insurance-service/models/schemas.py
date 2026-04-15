from typing import Literal, Optional
from pydantic import BaseModel, Field


class WeatherInfo(BaseModel):
    """Weather inputs used by risk and trigger models."""

    rainfall: float = Field(ge=0, le=500)
    temperature: float = Field(ge=-10, le=60)


class RiskScoreRequest(BaseModel):
    """Payload for zone/driver risk scoring."""

    h3_cell: str = Field(min_length=5, max_length=32)
    weather: WeatherInfo
    aqi: float = Field(ge=0, le=500)
    demand_ratio: float = Field(ge=0, le=5)
    historical_disruption_frequency: Optional[float] = Field(default=0.35, ge=0, le=1)
    zone_volatility: Optional[float] = Field(default=0.25, ge=0, le=1)
    avg_speed_kmh: Optional[float] = Field(default=18.0, ge=0, le=180)
    active_riders: Optional[int] = Field(default=0, ge=0, le=5000)
    event_timestamp: Optional[int] = Field(default=None, ge=0)
    driver_tenure_days: Optional[int] = Field(default=90, ge=0, le=10000)


class RiskScoreResponse(BaseModel):
    """Risk score response consumed by downstream pricing and trigger services."""

    Lf: float = Field(ge=0, le=1)
    risk_level: str
    confidence: float = Field(ge=0, le=1)
    scoring_path: str


class RiskModelScoreRequest(BaseModel):
    """Typed payload for live risk-model scoring used by backend premium service."""

    h3_cell: str = Field(min_length=5, max_length=32)
    rainfall_mm: float = Field(ge=0, le=500)
    aqi: float = Field(ge=0, le=500)
    demand_ratio: float = Field(ge=0, le=5)
    hour_of_day: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    historical_risk: float = Field(ge=0, le=1)


class RiskModelScoreResponse(BaseModel):
    """Response for live risk-model scoring with explicit model-path observability."""

    lf_score: float = Field(ge=0, le=1)
    zone_state: Literal["NORMAL", "ELEVATED", "HALTED"]
    confidence: float = Field(ge=0, le=1)
    model_used: Literal["xgboost", "fallback"]

# Pricing Engine Models
class PricingRequest(BaseModel):
    Ew: float = Field(ge=0)
    Lf: float = Field(ge=0, le=1)
    M: float = Field(ge=0, le=1)
    platform: Optional[str] = "uber"
    Ct: Optional[float] = Field(default=None, ge=0, le=1)
    demand_ratio: Optional[float] = Field(default=1.0, ge=0, le=5)
    zone_volatility: Optional[float] = Field(default=0.5, ge=0, le=1)

class PricingResponse(BaseModel):
    premium: float = Field(ge=0)
    zone_multiplier: float = Field(ge=0)

# Fraud Detection Models
class GPSInfo(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    speed: Optional[float] = Field(default=0.0, ge=0, le=250)
    h3_cell: Optional[str] = Field(default=None, min_length=5, max_length=32)
    h3_zone_consistency: Optional[float] = Field(default=1.0, ge=0, le=1)

class DeviceInfo(BaseModel):
    id: str = Field(min_length=3, max_length=128)
    mismatch: bool
    shared_driver_count_24h: Optional[int] = Field(default=1, ge=1, le=100)

class HistoryInfo(BaseModel):
    claims_filed: int = Field(ge=0, le=1000)
    claims_rejected: int = Field(ge=0, le=1000)
    has_history_in_zone: Optional[bool] = True
    last_12h_claims: Optional[int] = Field(default=0, ge=0, le=50)
    prior_gps_points_count: Optional[int] = Field(default=1, ge=1, le=100000)

class FraudScoreRequest(BaseModel):
    gps: GPSInfo
    device: DeviceInfo
    history: HistoryInfo

class FraudScoreResponse(BaseModel):
    score: float = Field(ge=0, le=1)
    label: str
    confidence: float = Field(ge=0, le=1)
    fraud_reason: str
    explanation: Optional[dict] = None


class FraudHybridScoreRequest(BaseModel):
    """Flat feature payload for live hybrid fraud scoring."""

    account_age_days: float = Field(ge=0, le=10000)
    device_id_uniqueness: float = Field(ge=0, le=1)
    device_switch_frequency: float = Field(ge=0, le=100)
    gps_speed: float = Field(ge=0, le=500)
    h3_zone_consistency: float = Field(ge=0, le=1)
    claims_last_30d: float = Field(ge=0, le=1000)
    claims_last_24h: float = Field(ge=0, le=100)
    trigger_frequency: float = Field(ge=0, le=100)
    earnings_pattern_deviation: float = Field(ge=0, le=100)
    mismatch: bool = False
    shared_driver_count_24h: int = Field(default=1, ge=1, le=100)


class FraudHybridScoreResponse(BaseModel):
    """Hybrid score output for backend decisioning and admin explainability."""

    fraud_score: float = Field(ge=0, le=100)
    rule_score: float = Field(ge=0, le=100)
    ml_anomaly_score: float = Field(ge=0, le=100)
    ml_classifier_score: float = Field(ge=0, le=100)
    top_signals: list[str]
    model_used: Literal["hybrid", "rules_only"]

# Trigger Engine Models
class TriggerRequest(BaseModel):
    h3_cell: str
    fraud_score: float

class TriggerResponse(BaseModel):
    decision: str
    Lf: float
    zone_state: str
