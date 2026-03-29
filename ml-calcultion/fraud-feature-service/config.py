"""
config.py — Central constants for Fraud Feature Extraction Service.

All tunable thresholds and defaults live here.
"""

# ── Storage ───────────────────────────────────────────────────────────────────
# Set USE_REDIS=True and configure REDIS_URL to switch from in-memory to Redis.
USE_REDIS: bool = False
REDIS_URL: str = "redis://localhost:6379/0"

# ── Cache TTL ─────────────────────────────────────────────────────────────────
USER_CACHE_TTL_SECONDS: int = 120        # Re-compute user features every 2 min

# ── H3 / Geospatial ───────────────────────────────────────────────────────────
H3_RESOLUTION: int = 8

# ── Feature windows ───────────────────────────────────────────────────────────
CLAIMS_WINDOW_DAYS: int = 30             # Lookback for claims_last_30d
DEVICE_SWITCH_WINDOW_DAYS: int = 7       # Lookback for device_switch_frequency
GPS_CONSISTENCY_WINDOW_HOURS: int = 24   # Lookback for h3_zone_consistency

# ── Speed / distance ──────────────────────────────────────────────────────────
MAX_PLAUSIBLE_SPEED_KMH: float = 200.0   # Cap GPS speed to avoid div/0 artefacts

# ── Safe defaults (returned when history is missing) ─────────────────────────
DEFAULT_ACCOUNT_AGE_DAYS: int = 0
DEFAULT_DEVICE_UNIQUENESS: float = 1.0   # Unknown → assume unique device
DEFAULT_DEVICE_SWITCH_FREQ: float = 0.0
DEFAULT_GPS_SPEED: float = 0.0
DEFAULT_GPS_CELL_DISTANCE: float = 0.0
DEFAULT_H3_ZONE_CONSISTENCY: float = 1.0
DEFAULT_CLAIMS_LAST_30D: int = 0
DEFAULT_TRIGGER_FREQUENCY: float = 0.0
DEFAULT_EARNINGS_DEVIATION: float = 0.0
