import asyncio
import json
import logging
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
    USE_REDIS,
    REDIS_URL,
    ZONE_KEY_TTL_SECONDS,
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPIC_ZONE_UPDATES,
)

logger = logging.getLogger(__name__)

# Redis initialization (optional, mirrors fraud-feature-service)
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None and USE_REDIS:
        try:
            import redis.asyncio as redis # type: ignore
            _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {REDIS_URL}")
        except Exception as exc:
            logger.error(f"Redis connection failed: {exc}")
            _redis_client = None
    return _redis_client


class ZoneAggregator:
    def __init__(self):
        # State: { h3_cell: Set[rider_id] }
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

    async def process_ping(self, h3_cell: str, rider_id: str, ts: float):
        """Called for every incoming ping from Kafka."""
        if h3_cell not in self.zone_riders:
            self.zone_riders[h3_cell] = set()
        self.zone_riders[h3_cell].add(rider_id)

    def _determine_state(self, lf: float) -> str:
        if lf > ZONE_HALTED_LF: return "HALTED"
        if lf > ZONE_DANGEROUS_LF: return "DANGEROUS"
        if lf > ZONE_SLOW_LF: return "SLOW"
        return "NORMAL"

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
        """Flushes aggregated counts to ML service and writes state back to Redis & Kafka."""
        redis = get_redis()
        
        while True:
            await asyncio.sleep(FLUSH_INTERVAL_SECONDS)
            
            # 1. Snapshot and clear active windows to avoid race conditions
            snapshot = self.zone_riders
            self.zone_riders = {}
            
            if not snapshot:
                continue
                
            logger.info(f"Flushing aggregates for {len(snapshot)} H3 zones...")

            # 2. Parallel ML calls per active zone
            async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
                for h3_cell, riders in snapshot.items():
                    rider_count = len(riders)
                    
                    # We need rainfall, aqi etc. For simplicity in the async engine, 
                    # we call h3-feature-service, BUT it calls ML internally.
                    # Alternatively, if we call ML directly, we need weather data.
                    # For this architectural pass, we will write to Redis directly
                    # assuming a placeholder risk score or relying on h3-feature-service 
                    # to do the heavy lifting.
                    
                    # In a fully integrated system, Grid Event Service calls H3 Feature Service
                    # to get the enriched vector, then ML Service to score. 
                    
                    # (Simplified for the demonstration - generating a dummy Lf based on density)
                    # High density -> high demand -> likely higher risk of disruption
                    lf_score = min(0.9, 0.1 * rider_count) 
                    
                    new_state = self._determine_state(lf_score)
                    old_state = self.zone_states.get(h3_cell, "NORMAL")

                    # 3. Write H3 Single Source of Truth to Redis
                    redis_payload = {
                        "zone_state": new_state,
                        "lf_score": lf_score,
                        "active_rider_count": rider_count,
                        "last_updated": time.time()
                    }
                    if redis:
                        try:
                            await redis.setex(
                                f"zone:{h3_cell}", 
                                ZONE_KEY_TTL_SECONDS, 
                                json.dumps(redis_payload)
                            )
                        except Exception as e:
                             logger.error(f"Redis write error on zone:{h3_cell}: {e}")

                    # 4. State Change Event (Kafka)
                    if new_state != old_state:
                        self.zone_states[h3_cell] = new_state
                        await self._publish_state_change(h3_cell, old_state, new_state, lf_score)
                        
            logger.info(f"Flush complete.")
