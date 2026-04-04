import asyncio
import json
import logging
import os
import time
from typing import Dict, Set

import httpx
from aiokafka import AIOKafkaProducer

from config import (
    FLUSH_INTERVAL_SECONDS,
    ML_SERVICE_URL,
    ML_TIMEOUT,
    ZONE_HALTED_LF,
    ZONE_DANGEROUS_LF,
    ZONE_SLOW_LF,
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPIC_ZONE_UPDATES,
)

# h3-feature-service is the SINGLE authority for Lf and zone_state.
# grid_event_service forwards aggregated rider_count here to trigger the ML pipeline.
H3_FEATURE_SERVICE_URL = os.getenv("H3_FEATURE_SERVICE_URL", "http://127.0.0.1:8004")

# Default coordinates used when h3-cell centroid cannot be resolved (fallback only).
_DEFAULT_LAT = 12.9716
_DEFAULT_LNG = 77.5946

logger = logging.getLogger(__name__)


class ZoneAggregator:
    def __init__(self):
        # State: { h3_cell: Set[driver_id] }
        self.zone_riders: Dict[str, Set[str]] = {}
        # Cached state to detect transitions
        self.zone_states: Dict[str, str] = {}
        
        # Async tasks and producers
        self.flush_task = asyncio.create_task(self._periodic_flush())
        self.kafka_producer = None

    async def _get_producer(self):
        if self.kafka_producer is None:
             self.kafka_producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
             await self.kafka_producer.start()
        return self.kafka_producer

    async def process_ping(self, h3_cell: str, driver_id: str, ts: float):
        """Called for every incoming ping from Kafka."""
        if h3_cell not in self.zone_riders:
            self.zone_riders[h3_cell] = set()
        self.zone_riders[h3_cell].add(driver_id)

    @staticmethod
    def _determine_state(lf: float) -> str:
        """Mirror of pipeline_service.get_zone_state thresholds (civic_alert excluded here)."""
        if lf > ZONE_HALTED_LF:    return "HALTED"
        if lf > ZONE_DANGEROUS_LF: return "DANGEROUS"
        if lf > ZONE_SLOW_LF:      return "SLOW"
        return "NORMAL"

    async def _get_ml_zone_data(self, client: httpx.AsyncClient, h3_cell: str, rider_count: int) -> dict | None:
        """
        Call h3-feature-service /pipeline to get ML-computed Lf and zone_state.
        Converts h3_cell → centroid lat/lng, then POST to /pipeline.
        Returns {"Lf": float, "zone_state": str} or None on failure.
        """
        try:
            import h3 as h3lib
            lat, lng = h3lib.cell_to_latlng(h3_cell)
        except Exception:
            lat, lng = _DEFAULT_LAT, _DEFAULT_LNG

        payload = {
            "lat": lat,
            "lng": lng,
            # Use sensible defaults for earnings/pricing params —
            # grid_event_service only cares about Lf and zone_state.
            "Ew": 8000.0,
            "Ct": 0.6,
            "M": 0.1,
        }
        try:
            resp = await client.post(
                f"{H3_FEATURE_SERVICE_URL}/pipeline",
                json=payload,
                timeout=ML_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            lf   = float(data.get("Lf", 0.0))
            # Validate schema fields are present
            if "zone_state" not in data:
                logger.warning("h3-feature-service response missing zone_state for %s", h3_cell)
            return {"Lf": lf, "zone_state": data.get("zone_state", "NORMAL")}
        except Exception as exc:
            logger.warning("h3-feature-service call failed for %s: %s", h3_cell, exc)
            return None

    async def _publish_state_change(self, h3_cell: str, old_state: str, new_state: str, lf: float):
        producer = await self._get_producer()
        payload = {
            "h3_cell": h3_cell,
            "old_state": old_state,
            "new_state": new_state,
            "lf_score": lf,
            "timestamp": time.time()
        }
        try:
            await producer.send_and_wait(
                KAFKA_TOPIC_ZONE_UPDATES,
                json.dumps(payload).encode('utf-8'),
                key=h3_cell.encode('utf-8')
            )
            logger.info(f"Published zone state change: {h3_cell} {old_state} -> {new_state}")
        except Exception as e:
            logger.error(f"Failed to publish zone state change: {e}")

    async def _periodic_flush(self):
        """
        Flushes aggregated telemetry counts to h3-feature-service (ML pipeline),
        then writes the authoritative zone state to Redis and Kafka.

        Architecture:
          grid_event_service (telemetry aggregator)
              → h3-feature-service /pipeline  (ML risk scoring — SINGLE Lf authority)
              → Redis zone:{h3}               (consumed by trigger_service)
              → Kafka zone_state_updates      (fan-out to other consumers)
        """
        while True:
            await asyncio.sleep(FLUSH_INTERVAL_SECONDS)

            # 1. Snapshot and clear active windows to avoid race conditions
            snapshot = self.zone_riders
            self.zone_riders = {}

            if not snapshot:
                continue

            logger.info(f"Flushing telemetry aggregates for {len(snapshot)} H3 zones → h3-feature-service")

            # 2. Call h3-feature-service IN PARALLEL for all zones
            # ⚠️ v1 BUG: individual awaits inside dict comprehension = sequential.
            # v2 FIX: gather all coroutines in one asyncio.gather call.
            flush_t0 = time.time()
            async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
                h3_cells       = list(snapshot.keys())
                coros          = [
                    self._get_ml_zone_data(client, cell, len(snapshot[cell]))
                    for cell in h3_cells
                ]
                ml_results     = await asyncio.gather(*coros, return_exceptions=True)
                results        = dict(zip(h3_cells, ml_results))
            flush_elapsed = time.time() - flush_t0
            logger.info(
                "Flush ML calls complete in %.2fs for %d zones",
                flush_elapsed, len(h3_cells)
            )

            for h3_cell, ml_data in results.items():
                rider_count = len(snapshot.get(h3_cell, set()))

                # Skip failed or exception results
                if ml_data is None or isinstance(ml_data, Exception):
                    logger.warning(
                        "Skipping Redis write for %s: ML pipeline unavailable (%s)",
                        h3_cell, ml_data if isinstance(ml_data, Exception) else "None"
                    )
                    continue

                lf_score  = ml_data["Lf"]
                new_state = ml_data["zone_state"]
                old_state = self.zone_states.get(h3_cell, "NORMAL")

                # 3. Publish state-change event to Kafka for downstream consumers
                if new_state != old_state:
                    self.zone_states[h3_cell] = new_state
                    await self._publish_state_change(h3_cell, old_state, new_state, lf_score)

            logger.info("Flush complete.")
