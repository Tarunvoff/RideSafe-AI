# Aegis Stream 2 — Python Kafka Consumer
# Consumes driver_telemetry topic
# Maps GPS to H3 cell at resolution 8
# Updates Redis zone state on every message

import json
import logging
import os
from typing import Any, Dict

import redis
from confluent_kafka import Consumer, Producer
from h3_mapper import geo_to_h3

LOGGER = logging.getLogger("grid_event_service")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

ZONE_STATE_KEY_TTL_SECONDS = 600
ALLOWED_ZONE_STATES = {"NORMAL", "SLOW", "DANGEROUS", "HALTED"}


def _kafka_consumer_config() -> Dict[str, Any]:
    bootstrap = os.getenv("KAFKA_BROKER_URL", "localhost:9092")
    return {
        "bootstrap.servers": bootstrap,
        "group.id": "aegis-grid-consumer-group",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    }


def _kafka_producer_config() -> Dict[str, Any]:
    bootstrap = os.getenv("KAFKA_BROKER_URL", "localhost:9092")
    return {"bootstrap.servers": bootstrap}


def _redis_client() -> redis.Redis:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    return redis.Redis.from_url(redis_url, decode_responses=True)


def _zone_state_key(h3_cell_id: str) -> str:
    return f"zone:{h3_cell_id}:state"


def get_zone_state(redis_client: redis.Redis, h3_cell_id: str) -> Dict[str, Any] | None:
    raw = redis_client.get(_zone_state_key(h3_cell_id))
    if not raw:
        return None

    try:
        payload = json.loads(raw)
        zone_state = str(payload.get("zone_state", "")).upper()
        if zone_state not in ALLOWED_ZONE_STATES:
            return None

        return {
            "zone_state": zone_state,
            "lf_score": float(payload.get("lf_score", 0.0)),
            "last_updated": str(payload.get("last_updated", "")),
            "active_rider_count": int(payload.get("active_rider_count", 0)),
        }
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def set_zone_state(
    redis_client: redis.Redis,
    h3_cell_id: str,
    zone_state: str,
    lf_score: float,
    last_updated: str,
    active_rider_count: int,
) -> None:
    value = {
        "zone_state": zone_state,
        "lf_score": float(lf_score),
        "last_updated": last_updated,
        "active_rider_count": int(active_rider_count),
    }
    redis_client.setex(
        _zone_state_key(h3_cell_id),
        ZONE_STATE_KEY_TTL_SECONDS,
        json.dumps(value),
    )


def run() -> None:
    consumer = Consumer(_kafka_consumer_config())
    producer = Producer(_kafka_producer_config())
    redis_client = _redis_client()

    consumer.subscribe(["driver_telemetry"])
    LOGGER.info("Subscribed to topic=driver_telemetry")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                LOGGER.error("Kafka consumer error: %s", msg.error())
                continue

            try:
                payload = json.loads(msg.value().decode("utf-8"))
                rider_id = str(payload["rider_id"])
                lat = float(payload["lat"])
                lng = float(payload["lng"])
                timestamp = str(payload["timestamp"])

                h3_cell_id = geo_to_h3(lat, lng, 8)

                current_zone = get_zone_state(redis_client, h3_cell_id)
                old_state = current_zone["zone_state"] if current_zone else ""

                requested_zone_state = str(payload.get("zone_state", "NORMAL")).upper()
                new_state = requested_zone_state if requested_zone_state in ALLOWED_ZONE_STATES else "NORMAL"

                lf_score = float(payload.get("lf_score", 0.0))
                active_rider_count = int(
                    payload.get(
                        "active_rider_count",
                        (current_zone["active_rider_count"] + 1) if current_zone else 1,
                    )
                )

                set_zone_state(
                    redis_client=redis_client,
                    h3_cell_id=h3_cell_id,
                    zone_state=new_state,
                    lf_score=lf_score,
                    last_updated=timestamp,
                    active_rider_count=active_rider_count,
                )

                if old_state != new_state:
                    update_payload = {
                        "h3_cell_id": h3_cell_id,
                        "rider_id": rider_id,
                        "old_state": old_state,
                        "new_state": new_state,
                        "timestamp": timestamp,
                    }
                    producer.produce(
                        "zone_state_updates",
                        key=h3_cell_id,
                        value=json.dumps(update_payload).encode("utf-8"),
                    )
                    producer.flush()

                consumer.commit(message=msg, asynchronous=False)

                LOGGER.info(
                    "rider_id=%s h3_cell_id=%s zone_state=%s timestamp=%s",
                    rider_id,
                    h3_cell_id,
                    new_state,
                    timestamp,
                )
            except Exception as exc:
                LOGGER.exception("Failed to process message: %s", exc)
    finally:
        consumer.close()


if __name__ == "__main__":
    run()
