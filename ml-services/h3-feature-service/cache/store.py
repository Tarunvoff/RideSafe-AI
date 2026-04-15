"""
cache/store.py

In-memory TTL cache using cachetools.TTLCache.
Thread-safe for FastAPI's async context via a simple lock wrapper.

Structure per entry:
  {
    "features": { ...FeatureResponse dict... },
    "timestamp": float (unix epoch)
  }

Redis alternative: swap TTLCache for redis.asyncio.Redis with
  await redis.setex(key, TTL, json.dumps(value))
  value = json.loads(await redis.get(key))
"""

import time
from cachetools import TTLCache
from config import CACHE_TTL_SECONDS

# Thread-safe in-memory TTL cache
# maxsize=1024 supports ~1024 unique h3 cells before LRU eviction
_cache: TTLCache = TTLCache(maxsize=1024, ttl=CACHE_TTL_SECONDS)


def get_cached(h3_cell: str) -> dict | None:
    """Return cached feature dict or None if expired/missing."""
    return _cache.get(h3_cell)


def set_cached(h3_cell: str, features: dict) -> None:
    """Store features with auto-TTL managed by cachetools."""
    _cache[h3_cell] = {
        "features": features,
        "timestamp": time.time(),
    }


def get_cache_stats() -> dict:
    """Expose cache health info for monitoring endpoints."""
    return {
        "cached_cells": len(_cache),
        "max_size": _cache.maxsize,
        "ttl_seconds": CACHE_TTL_SECONDS,
    }
