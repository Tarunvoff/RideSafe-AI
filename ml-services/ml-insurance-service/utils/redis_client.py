import os
import redis
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            try:
                cls._instance.client = redis.from_url(url, decode_responses=True)
                logger.info(f"Connected to Redis at {url}")
            except Exception as e:
                cls._instance.client = None
                logger.error(f"Failed to connect to Redis: {e}")
        return cls._instance

    def is_token_revoked(self, token: str) -> bool:
        if not self.client or not token:
            return False
        try:
            # Use EXISTS check for <5ms O(1) performance
            return self.client.sismember("revoked_tokens", token)
        except Exception as e:
            logger.warning(f"Redis revocation check failed: {e}")
            return False

redis_client = RedisClient()
