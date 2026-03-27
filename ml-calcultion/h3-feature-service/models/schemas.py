from pydantic import BaseModel, Field
from typing import Optional


class FeatureRequest(BaseModel):
    h3_cell: str


class FeatureResponse(BaseModel):
    """
    Full ML-ready feature vector.
    Output format matches both:
      - ml-insurance-service /risk-score input
      - ml_microservice /predict-risk feature engineering expectations
    """
    h3_cell: str
    latitude: float
    longitude: float

    # Weather (from Open-Meteo — ported from ml_microservice WeatherService)
    rainfall: float           # mm — last full hour
    temperature: float        # °C
    humidity: float           # %

    # AQI (from OpenAQ v3 — ported from ml_microservice AQIService)
    aqi: float                # US EPA AQI (computed from PM2.5 or PM10)
    pm25: float               # µg/m³
    pm10: float               # µg/m³

    # Platform Activity (ported from ml_microservice PlatformActivityService)
    platform_orders: int
    active_riders: int
    demand_ratio: float       # riders / orders

    # Civic disruption (ported from ml_microservice CivicAlertService)
    civic_alert: bool

    # Temporal features (from ml_microservice FeatureEngineering)
    hour_of_day: int
    day_of_week: int
    month: int
    season: int               # 0=winter, 1=summer, 2=monsoon, 3=post-monsoon

    # Historical risk (placeholder — replace with DB lookup)
    historical_risk: float


class PipelineRequest(BaseModel):
    """
    Input for the full end-to-end pipeline:
      GPS → H3 → /features → /risk-score → /pricing
    """
    lat: float = Field(..., description="GPS latitude", example=12.9352)
    lng: float = Field(..., description="GPS longitude", example=77.6245)
    Ew: float  = Field(..., description="Weekly earnings in ₹", example=8000.0)
    Ct: float  = Field(0.6, description="Coverage tier (0.4 / 0.6 / 0.8)", example=0.6)
    M: float   = Field(0.1, description="Margin hint (0.08–0.15, ML may override)", example=0.1)


class PipelineResponse(BaseModel):
    """
    Full pipeline output: environment + risk + pricing — single API call.
    """
    h3_cell: str
    latitude: float
    longitude: float

    # Live environment signals
    rainfall: float
    temperature: float
    aqi: float
    demand_ratio: float
    civic_alert: bool

    # Risk scoring
    Lf: float
    risk_level: str          # LOW / MEDIUM / HIGH
    zone_state: str          # NORMAL / SLOW / DANGEROUS / HALTED

    # Pricing
    Ew: float
    Ct: float
    premium: float           # Final premium in ₹ (clamped ₹15–₹150)
