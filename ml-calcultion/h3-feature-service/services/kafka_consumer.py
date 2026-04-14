"""
services/kafka_consumer.py — H3 Feature Service Kafka Consumer [v2]

v2 Additions:
  [ED] Event-driven pipeline trigger: after updating speed, fire run_pipeline_from_kafka
       for the cell (debounced: max once per KAFKA_PIPELINE_TRIGGER_INTERVAL seconds).
  [RC] Also publish rider_count increment to Redis (h3:riders:{cell}) for
       demand_ratio enrichment in feature_service.
  [RD] Per-cell debounce: prevents pipeline from firing on every single message
       when drivers move at 10Hz — only triggers once per interval.
  [TV] Telemetry validation: reject messages with invalid coords or negative speed.

Contract (driver_telemetry topic):
  { driverId: UUID, lat: Float, lon/lng: Float, timestamp: ISO8601, speed: Float }
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional

from aiokafka import AIOKafkaConsumer  # type: ignore
from aiokafka.errors import GroupCoordinatorNotAvailableError, KafkaError  # type: ignore

import h3  # type: ignore

from config import (
    KAFKA_BOOTSTRAP_SERVERS,
    H3_RESOLUTION,
)

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
# How often (seconds) a Kafka event can trigger a full pipeline run per H3 cell.
# At 0.5s → max 2 pipeline runs/sec per cell. At simulation scale with 30+ cells,
# total pipeline throughput = 60 calls/s — sustainable with circuit breaker.
_TRIGGER_INTERVAL = float(os.getenv("KAFKA_PIPELINE_TRIGGER_INTERVAL", "10.0"))

# ── Redis connection (lazy, async) ─────────────────────────────────────────────
_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis  # type: ignore
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        _redis_client = aioredis.from_url(redis_url, decode_responses=True)
        logger.info("Kafka consumer connected to Redis at %s", redis_url)
    except Exception as exc:
        logger.warning("Redis unavailable in Kafka consumer: %s — in-memory fallback", exc)
        _redis_client = None
    return _redis_client


# ── In-memory fallback ─────────────────────────────────────────────────────────
_speed_cache: dict = {}
_rider_cache: dict = {}  # h3_cell → {rider_ids: set}

# ── Per-cell pipeline trigger debounce ───────────────────────────────────────
# h3_cell → timestamp of last pipeline trigger
_last_trigger: dict[str, float] = {}


# ─────────────────────────────────────────────────────────────────────────────

async def _update_speed(h3_cell: str, speed: float) -> float:
    """
    Maintain running average of speed per H3 cell via Redis HASH.
    Keys: h3:speed:{h3_cell}  →  {total_speed, count, avg_speed}
    TTL: 5 minutes (auto-refreshed on each update)
    """
    redis = _get_redis()
    key = f"h3:speed:{h3_cell}"

    if redis:
        try:
            pipe = redis.pipeline()
            pipe.hincrbyfloat(key, "total_speed", speed)
            pipe.hincrby(key, "count", 1)
            pipe.expire(key, 300)
            results = await pipe.execute()
            total = float(results[0])
            count = int(results[1])
            avg = round(total / count, 4) if count else 0.0
            await redis.hset(key, "avg_speed", avg)
            logger.debug("H3 %s avg_speed=%.2f km/h (n=%d)", h3_cell, avg, count)
            return avg
        except Exception as exc:
            logger.warning("Redis speed update failed: %s", exc)

    # In-memory fallback
    entry = _speed_cache.setdefault(h3_cell, {"total_speed": 0.0, "count": 0, "avg_speed": 0.0})
    entry["total_speed"] += speed
    entry["count"] += 1
    entry["avg_speed"] = round(entry["total_speed"] / entry["count"], 4)
    return entry["avg_speed"]


async def _update_rider_count(h3_cell: str, driver_id: str) -> int:
    """
    Track unique active riders per H3 cell in Redis SET.
    Key: h3:riders:{h3_cell}  →  SET of driverIds
    TTL: 5 min (refresh on every ping)
    Used by feature_service for demand_ratio enrichment.
    """
    redis = _get_redis()
    key = f"h3:riders:{h3_cell}"

    if redis:
        try:
            await redis.sadd(key, driver_id)
            await redis.expire(key, 300)
            count = await redis.scard(key)
            return int(count)
        except Exception as exc:
            logger.warning("Redis rider count update failed: %s", exc)

    # In-memory fallback
    cell_riders = _rider_cache.setdefault(h3_cell, set())
    cell_riders.add(driver_id)
    return len(cell_riders)


async def get_avg_speed(h3_cell: str) -> float:
    """Public read accessor — used by pipeline_service for feature enrichment."""
    redis = _get_redis()
    if redis:
        try:
            val = await redis.hget(f"h3:speed:{h3_cell}", "avg_speed")
            return float(val) if val else 0.0
        except Exception:
            pass
    return _speed_cache.get(h3_cell, {}).get("avg_speed", 0.0)


async def get_active_rider_count(h3_cell: str) -> int:
    """Public read accessor — used by feature_service for demand_ratio."""
    redis = _get_redis()
    if redis:
        try:
            count = await redis.scard(f"h3:riders:{h3_cell}")
            return int(count) if count else 0
        except Exception:
            pass
    return len(_rider_cache.get(h3_cell, set()))


def _validate_telemetry(payload: dict) -> tuple[Optional[float], Optional[float], float, str]:
    """
    Validate and extract (lat, lon, speed, driver_id) from a telemetry dict.
    Returns (None, None, ...) if validation fails.
    """
    lat: Optional[float]   = payload.get("lat")
    lon: Optional[float]   = payload.get("lon") or payload.get("lng")
    speed: float           = float(payload.get("speed", 0.0))
    driver_id: str         = str(payload.get("driverId", "unknown"))

    if lat is None or lon is None:
        return None, None, speed, driver_id
    lat, lon = float(lat), float(lon)
    if not (-90.0 <= lat <= 90.0):
        return None, None, speed, driver_id
    if not (-180.0 <= lon <= 180.0):
        return None, None, speed, driver_id
    if abs(lat) < 0.1 and abs(lon) < 0.1:
        return None, None, speed, driver_id
    if speed < 0.0:
        speed = 0.0  # clamp; don't reject — GPS glitch may give negative delta
    return lat, lon, speed, driver_id


async def _maybe_trigger_pipeline(h3_cell: str, lat: float, lon: float):
    """
    Event-driven pipeline trigger — fires run_pipeline_from_kafka at most once
    per _TRIGGER_INTERVAL seconds per H3 cell.

    This is the 'Kafka → ML Pipeline → Redis' path that bypasses HTTP polling.
    """
    now = time.monotonic()
    last = _last_trigger.get(h3_cell, 0.0)

    if now - last < _TRIGGER_INTERVAL:
        return  # debounce: not enough time has passed

    _last_trigger[h3_cell] = now

    # Import here to avoid circular import at module load time
    try:
        from services.pipeline_service import run_pipeline_from_kafka
        asyncio.create_task(
            run_pipeline_from_kafka(h3_cell, lat, lon)
        )
        logger.debug("Kafka → Pipeline triggered for H3=%s", h3_cell)
    except Exception as exc:
        logger.error("Failed to trigger pipeline from Kafka for %s: %s", h3_cell, exc)


async def run_h3_kafka_consumer():
    """
    Long-running Kafka consumer coroutine.
    Started from main.py lifespan startup.
    Retries on KafkaError with capped exponential back-off.
    """
    logger.info(
        "H3 Kafka consumer starting — broker=%s topic=driver_telemetry trigger_interval=%.1fs",
        KAFKA_BOOTSTRAP_SERVERS, _TRIGGER_INTERVAL
    )

    consumer = AIOKafkaConsumer(
        "driver_telemetry",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="h3-feature-service",
        auto_offset_reset="latest",
        enable_auto_commit=True,
        retry_backoff_ms=3000,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    aiokafka_group_logger = logging.getLogger("aiokafka.consumer.group_coordinator")

    retry_delay = 2
    while True:
        previous_level = aiokafka_group_logger.level
        try:
            # During broker warm-up, coordinator discovery can spam logs very fast.
            aiokafka_group_logger.setLevel(logging.CRITICAL)
            await consumer.start()
            logger.info("H3 Kafka consumer connected ✅")
            break
        except GroupCoordinatorNotAvailableError as exc:
            logger.warning(
                "Kafka coordinator unavailable for group=h3-feature-service "
                "broker=%s topic=driver_telemetry. Retrying in %ds... (%s)",
                KAFKA_BOOTSTRAP_SERVERS,
                retry_delay,
                exc,
            )
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
        except KafkaError as exc:
            logger.warning("Kafka not ready, retrying in %ds... (%s)", retry_delay, exc)
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
        finally:
            aiokafka_group_logger.setLevel(previous_level)

    try:
        async for msg in consumer:
            try:
                payload = msg.value  # already deserialized by value_deserializer

                lat, lon, speed, driver_id = _validate_telemetry(payload)
                if lat is None or lon is None:
                    logger.warning("Telemetry rejected (invalid coords): %s", payload)
                    continue

                # Map GPS → H3 cell
                h3_cell = h3.latlng_to_cell(lat, lon, H3_RESOLUTION)

                # [RC] Update rider count
                rider_count = await _update_rider_count(h3_cell, driver_id)

                # [Speed] Update running avg speed
                avg_speed = await _update_speed(h3_cell, speed)

                logger.debug(
                    "driver=%s h3=%s speed=%.1f km/h avg=%.2f km/h riders=%d",
                    driver_id, h3_cell, speed, avg_speed, rider_count
                )

                # [ED] Event-driven pipeline trigger (debounced per cell)
                await _maybe_trigger_pipeline(h3_cell, lat, lon)

            except (KeyError, ValueError, TypeError) as exc:
                logger.error("Malformed telemetry message: %s | error: %s", msg.value, exc)
            except Exception as exc:
                logger.exception("Unexpected error processing telemetry: %s", exc)

    except KafkaError as exc:
        logger.critical("Fatal Kafka error in H3 consumer: %s", exc)
    finally:
        await consumer.stop()
        logger.info("H3 Kafka consumer stopped.")
