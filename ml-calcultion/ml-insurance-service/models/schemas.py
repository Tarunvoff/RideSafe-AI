from pydantic import BaseModel, Field
from typing import Optional, Dict

# Risk Estimation Models
class WeatherInfo(BaseModel):
    rainfall: float
    temperature: float

class RiskScoreRequest(BaseModel):
    h3_cell: str
    weather: WeatherInfo
    aqi: float
    demand_ratio: float
    # Add optional features since they are needed by the ML model
    historical_disruption_frequency: Optional[float] = 0.5
    zone_volatility: Optional[float] = 0.5

class RiskScoreResponse(BaseModel):
    Lf: float
    risk_level: str

# Pricing Engine Models
class PricingRequest(BaseModel):
    Ew: float
    Lf: float
    Ct: float
    M: float

class PricingResponse(BaseModel):
    premium: float

# Fraud Detection Models
class GPSInfo(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0

class DeviceInfo(BaseModel):
    id: str
    mismatch: bool

class HistoryInfo(BaseModel):
    claims_filed: int
    claims_rejected: int

class FraudScoreRequest(BaseModel):
    gps: GPSInfo
    device: DeviceInfo
    history: HistoryInfo

class FraudScoreResponse(BaseModel):
    score: float
    label: str

# Trigger Engine Models
class TriggerRequest(BaseModel):
    Lf: float
    zone_state: str
    fraud_score: float

class TriggerResponse(BaseModel):
    decision: str
