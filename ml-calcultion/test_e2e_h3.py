import asyncio
import json
import httpx
import time
from aiokafka import AIOKafkaProducer

import h3

# Constants (Matches our microservice deployments)
KAFKA_BROKER = "localhost:9092"
TOPIC = "driver_telemetry"
FRAUD_URL = "http://localhost:8002/fraud-features"
TRIGGER_URL = "http://localhost:8000/trigger"
GRID_URL = "http://localhost:8003/zones"
PLATFORM_LIVE_GPS_URL = "http://localhost:3001/api/platform/live-gps"

# Simulating a location (e.g., somewhere in Bangalore)
TEST_LAT = 12.9352
TEST_LNG = 77.6245
TEST_H3 = h3.latlng_to_cell(TEST_LAT, TEST_LNG, 8) 


async def produce_telemetry(producer, user_id):
    """Simulate the NestJS backend publishing a GPS ping to Kafka."""
    payload = {
        "driverId": user_id,
        "lat": TEST_LAT,
        "lng": TEST_LNG,
        "speed": 28.5,
        "timestamp": int(time.time()),
        "platform": "uber",
        "h3_cell": TEST_H3
    }
    await producer.send_and_wait(
        TOPIC, 
        key=user_id.encode('utf-8'),
        value=json.dumps(payload).encode('utf-8')
    )
    print(f"[1. KAFKA] Produced telemetry for {user_id} in {TEST_H3}")


async def main():
    print(f"🚀 INITIATING RIDESAFE-AI E2E H3 PIPELINE TEST\n{'-'*60}")
    
    # ── 1. Publish Telemetry (Async Flow) ──────────────────────────────────
    print("\n📡 STEP 1: Simulating NestJS GPS Telemetry stream into Kafka...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                PLATFORM_LIVE_GPS_URL,
                params={"zone": TEST_H3, "provider": "zepto", "count": 6},
            )
            resp.raise_for_status()
            live = resp.json()
            print(f"   ✓ Live GPS published: {live.get('published', 0)} drivers")
        except Exception as exc:
            print(f"   ⚠️ Live GPS endpoint failed: {exc} — falling back to direct Kafka publish")
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
            await producer.start()
            try:
                users = ["u_test_1", "u_test_2", "u_test_3", "u_test_4", "u_test_5", "u_test_burst"]
                for u in users:
                    await produce_telemetry(producer, u)
            finally:
                await producer.stop()

    # Grid Event Service aggregates every 10 seconds. We must wait for the flush.
    print("\n⏳ Waiting 12 seconds for the Grid Event Service to aggregate and flush to Redis...")
    for i in range(12, 0, -1):
        print(f"   {i}s...", end="\r")
        await asyncio.sleep(1)


    # ── 2. Check Grid Service (Redis SSOT) ──────────────────────────────────
    print("\n\n📊 STEP 2: Querying Grid Event Service (Redis SSOT) for Zone State")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(f"{GRID_URL}/{TEST_H3}")
            zone_data = r.json()
            print(f"   ✓ Redis Data for {TEST_H3}:")
            print(json.dumps(zone_data, indent=2))
        except Exception as e:
            print(f"   ❌ Failed to query Grid Event Service: {e}")


    # ── 3. Check Fraud Feature Extraction (Sync Flow) ───────────────────────
    print("\n\n🕵️ STEP 3: Testing Fraud Feature Extraction")
    # Simulating standard driver 'u_test_burst' making a claim
    claim_payload = {
        "user_id": "u_test_burst",
        "device_id": "d_test",
        "upi_id": "upi_test",
        "lat": TEST_LAT,
        "lng": TEST_LNG,
        "timestamp": int(time.time()),
        "claim_amount": 500.0,
        "event_type": "CLAIM"
    }
    
    fraud_score = 0.5 # default fallback
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(FRAUD_URL, json=claim_payload)
            fraud_data = r.json()
            print(f"   ✓ Extracted Features (Notice the H3 signals):")
            print(json.dumps(fraud_data['location'], indent=2))
            
            # Since we wrote to local mock ML models earlier, let's pretend a score was given
            # In complete prod, we'd hit /fraud endpoint of ml_insurance_service
        except Exception as e:
            print(f"   ❌ Failed to query Fraud Feature Service: {e}")


    # ── 4. Evaluate Parametric Trigger (Sync Flow) ──────────────────────────
    print("\n\n⚡ STEP 4: Firing the Parametric Trigger Engine")
    trigger_payload = {
        "h3_cell": TEST_H3,
        "fraud_score": fraud_score
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(TRIGGER_URL, json=trigger_payload)
            trigger_data = r.json()
            print(f"   ✓ Trigger Decision via Redis H3 State:")
            print(json.dumps(trigger_data, indent=2))
        except Exception as e:
            print(f"   ❌ Failed to query ML Trigger Service: {e}")
            
    print(f"\n{'-'*60}\n✅ END-TO-END TEST COMPLETE")

if __name__ == "__main__":
    asyncio.run(main())
