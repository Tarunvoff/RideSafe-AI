import asyncio
import json
import logging
import h3
from aiokafka import AIOKafkaConsumer # type: ignore
from aiokafka.errors import GroupCoordinatorNotAvailableError, KafkaError # type: ignore

from config import (
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_CONSUMER_GROUP,
    KAFKA_TOPIC_TELEMETRY,
)
from services.zone_aggregator import ZoneAggregator

logger = logging.getLogger(__name__)


async def run_kafka_consumer(aggregator: ZoneAggregator):
    """
    Consumes driver telemetry messages from Kafka and streams them
    into the real-time Zone Aggregator.
    """
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC_TELEMETRY,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_CONSUMER_GROUP,
        auto_offset_reset="latest",
        enable_auto_commit=True,
        retry_backoff_ms=3000,
    )

    aiokafka_group_logger = logging.getLogger("aiokafka.consumer.group_coordinator")

    while True:
        previous_level = aiokafka_group_logger.level
        try:
            # aiokafka retries coordinator discovery very aggressively by default,
            # which can flood logs while Kafka is warming up.
            aiokafka_group_logger.setLevel(logging.CRITICAL)
            await consumer.start()
            logger.info(f"Kafka consumer started on topic: {KAFKA_TOPIC_TELEMETRY}")
            break
        except GroupCoordinatorNotAvailableError as e:
            logger.warning(
                "Kafka group coordinator unavailable for group '%s'. "
                "bootstrap=%s topic=%s. Retrying in 5 seconds... (%s)",
                KAFKA_CONSUMER_GROUP,
                KAFKA_BOOTSTRAP_SERVERS,
                KAFKA_TOPIC_TELEMETRY,
                e,
            )
            await asyncio.sleep(5)
        except KafkaError as e:
            logger.warning(
                "Kafka not ready for bootstrap=%s topic=%s group=%s. "
                "Retrying in 5 seconds... (%s)",
                KAFKA_BOOTSTRAP_SERVERS,
                KAFKA_TOPIC_TELEMETRY,
                KAFKA_CONSUMER_GROUP,
                e,
            )
            await asyncio.sleep(5)
        finally:
            aiokafka_group_logger.setLevel(previous_level)

    try:
        async for msg in consumer:
            try:
                # payload expected:
                # {
                #   "driverId": "u123",
                #   "lat": 12.34,
                #   "lng": 56.78,
                #   "speed": 32.5,
                #   "timestamp": 1234567890.1,
                #   "platform": "Aegis",
                #   "h3_cell": "8860144b61fffff"
                # }
                payload = json.loads(msg.value)
                driver_id = payload.get("driverId")
                lat = payload.get("lat")
                lng = payload.get("lng")

                if driver_id is None or lat is None or lng is None:
                    continue

                lat = float(lat)
                lng = float(lng)

                if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                    logger.warning("Skipping telemetry with invalid coords: driver=%s lat=%s lng=%s", driver_id, lat, lng)
                    continue

                if lat == 0.0 and lng == 0.0:
                    logger.warning("Skipping telemetry sentinel coords (0,0): driver=%s", driver_id)
                    continue

                # h3-py v4 renamed geo_to_h3 -> latlng_to_cell; keep fallback for older runtimes.
                h3_cell = (
                    h3.latlng_to_cell(lat, lng, 8)
                    if hasattr(h3, "latlng_to_cell")
                    else h3.geo_to_h3(lat, lng, 8)
                )
                
                if h3_cell and driver_id:
                    await aggregator.process_ping(h3_cell, driver_id, payload.get("timestamp"), lat=lat, lng=lng)

            except json.JSONDecodeError:
                logger.error(f"Malformed JSON in Kafka message: {msg.value}")
            except Exception as e:
                logger.error(f"Error processing Kafka message: {e}")

    except KafkaError as e:
        logger.critical(f"Kafka connection error: {e}")
    finally:
        await consumer.stop()
        logger.info("Kafka consumer stopped.")
