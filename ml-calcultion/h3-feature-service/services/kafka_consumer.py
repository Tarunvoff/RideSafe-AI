"""
services/kafka_consumer.py — H3 Feature Service Kafka Consumer

Task 1 Implementation:
  Step 1: aiokafka consumer listening to `driver_telemetry` topic.
  Step 2: Parse incoming JSON, extract GPS coords → map to H3 cell.
  Step 3: Keep running average of speed per H3 cell in Redis.

Contract (from Dev Spec Section E):
  Topic `driver_telemetry`:
    { driverId: UUID, lat: Float, lon: Float, timestamp: ISO8601, speed: Float }
"""

import asyncio
import json
import logging
import time
from typing import Optional

from aiokafka import AIOKafkaConsumer  # type: ignore
from aiokafka.errors import KafkaError  # type: ignore

import h3  # type: ignore

from config import (
    KAFKA_BOOTSTRAP_SERVERS,
    H3_RESOLUTION,
)

logger = logging.getLogger(__name__)

# ── Redis connection (lazy, reuses pool from pipeline_service) ─────────────────
_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import os
        import redis.asyncio as aioredis  # type: ignore
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        _redis_client = aioredis.from_url(redis_url, decode_responses=True)
        logger.info("H3-feature-service connected to Redis at %s", redis_url)
    except Exception as exc:
        logger.warning("Redis unavailable for speed cache: %s — using in-memory fallback", exc)
        _redis_client = None
    return _redis_client


# ── In-memory fallback when Redis is not available ────────────────────────────
# Structure: { h3_cell: {"total_speed": float, "count": int, "avg_speed": float} }
_speed_cache: dict = {}


async def _update_speed(h3_cell: str, speed: float):
    """
    Maintain a running average of speed per H3 cell.
    Persists in Redis (TTL = 5 min). Falls back to in-memory dict.
    """
    redis = _get_redis()
    key = f"h3:speed:{h3_cell}"

    if redis:
        try:
            # Atomic increment of total and count using HINCRBYFLOAT / HINCRBY
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


async def get_avg_speed(h3_cell: str) -> float:
    """Public read accessor — used by pipeline_service for feature enrichment."""
    redis = _get_redis()
    if redis:
        try:
            val = await redis.hget(f"h3:speed:{h3_cell}", "avg_speed")
            return float(val) if val else 0.0
        except Exception:
            pass
    entry = _speed_cache.get(h3_cell, {})
    return entry.get("avg_speed", 0.0)


async def run_h3_kafka_consumer():
    """
    Long-running Kafka consumer coroutine.
    Calls from main.py lifespan startup.
    Retries on KafkaError with exponential back-off.
    """
    logger.info("H3 Kafka consumer starting — broker=%s topic=driver_telemetry", KAFKA_BOOTSTRAP_SERVERS)

    consumer = AIOKafkaConsumer(
        "driver_telemetry",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="h3-feature-service",
        auto_offset_reset="latest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    # Retry loop until Kafka is ready
    retry_delay = 2
    while True:
        try:
            await consumer.start()
            logger.info("H3 Kafka consumer connected ✅")
            break
        except KafkaError as exc:
            logger.warning("Kafka not ready, retrying in %ds... (%s)", retry_delay, exc)
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)  # capped exponential back-off

    try:
        async for msg in consumer:
            try:
                payload = msg.value  # already deserialized

                # Support both spec field names ("lon") and our internal names ("lng")
                lat: Optional[float] = payload.get("lat")
                lon: Optional[float] = payload.get("lon") or payload.get("lng")
                speed: float = float(payload.get("speed", 0.0))

                if lat is None or lon is None:
                    logger.warning("Skipping message missing lat/lon: %s", payload)
                    continue

                # Step 2 — Map GPS → H3 cell
                h3_cell = h3.latlng_to_cell(lat, lon, H3_RESOLUTION)

                # Step 3 — Update running average of speed in Redis
                avg = await _update_speed(h3_cell, speed)
                logger.debug(
                    "driver=%s h3=%s speed=%.1f km/h avg=%.2f km/h",
                    payload.get("driverId", "?"), h3_cell, speed, avg
                )

            except (KeyError, ValueError, TypeError) as exc:
                logger.error("Malformed telemetry message: %s | error: %s", msg.value, exc)
            except Exception as exc:
                logger.exception("Unexpected error processing message: %s", exc)

    except KafkaError as exc:
        logger.critical("Fatal Kafka error in H3 consumer: %s", exc)
    finally:
        await consumer.stop()
        logger.info("H3 Kafka consumer stopped.")
