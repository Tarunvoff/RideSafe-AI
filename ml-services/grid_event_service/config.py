"""
config.py — Grid Event Service configuration.

All Kafka, Redis, and aggregation constants live here.
"""

import os

# ── H3 resolution (MUST match all other services) ────────────────────────────
H3_RESOLUTION: int = 8

# ── Kafka ─────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "127.0.0.1:9092")
KAFKA_CONSUMER_GROUP: str = "grid-event-service"
KAFKA_TOPIC_TELEMETRY: str = "driver_telemetry"
KAFKA_TOPIC_ZONE_UPDATES: str = "zone_state_updates"

# ── Redis (zone state store) ──────────────────────────────────────────────────
USE_REDIS: bool = os.getenv("USE_REDIS", "True").lower() == "true"
REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
ZONE_KEY_TTL_SECONDS: int = 300   # 5-minute TTL on zone:{h3} keys

# ── Aggregation window ────────────────────────────────────────────────────────
AGGREGATION_WINDOW_SECONDS: int = 60    # Roll-up window for per-cell ping counts
FLUSH_INTERVAL_SECONDS: float = 10.0   # How often the aggregator flushes to ML + Redis

# ── ML Service ────────────────────────────────────────────────────────────────
ML_SERVICE_URL: str = os.getenv("ML_SERVICE_URL", "http://127.0.0.1:8000")
ML_TIMEOUT: float = 8.0

# ── Zone state thresholds (mirrors pipeline_service.py in h3-feature-service) ─
ZONE_HALTED_LF: float = 0.75
ZONE_DANGEROUS_LF: float = 0.60
ZONE_SLOW_LF: float = 0.40

# ── H3 burst fraud detection ──────────────────────────────────────────────────
# If ≥ BURST_USER_THRESHOLD distinct users appear in the same H3 cell
# within BURST_TIME_WINDOW_SECONDS → mark as fraud cluster
BURST_USER_THRESHOLD: int = 5
BURST_TIME_WINDOW_SECONDS: int = 60
