import redis
import os
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# Using decode_responses=True so we get strings instead of bytes
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def get_cached_zone_data(zone_id: int):
    try:
        data = redis_client.get(f"zone_intelligence:{zone_id}")
        if data:
            return json.loads(data)
    except Exception as e:
        print(f"Redis get error: {e}")
    return None

def set_cached_zone_data(zone_id: int, data: dict, expire: int = 30):
    try:
        redis_client.setex(f"zone_intelligence:{zone_id}", expire, json.dumps(data))
    except Exception as e:
        print(f"Redis set error: {e}")
