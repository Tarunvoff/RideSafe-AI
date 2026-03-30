"""
storage/store.py — Unified storage abstraction.

Supports two backends selected via config.USE_REDIS:
  • False (default) → thread-safe in-memory dict (great for dev/testing)
  • True            → Redis (production; set REDIS_URL in config.py)

Data model per user:
  user:{user_id} → {
      "created_at": int (unix epoch),
      "devices": [{"device_id": str, "timestamp": int}, ...],
      "claims":  [{"amount": float, "timestamp": int}, ...],
      "gps_history": [{"lat": float, "lng": float, "timestamp": int}, ...],
      "earnings": [float, ...],          # historical daily earnings
  }

Data model per device:
  device:{device_id} → {
      "users": [user_id, ...],
      "high_share": bool,               # True if >3 distinct users on device
  }

Data model per zone:
  zone_fraud:{h3_cell} → {
      "active_riders": int,
      "claim_count": int,
      "burst_detected": bool,
      "recent_users": [{"user_id": str, "timestamp": int}, ...]
  }

Data model per H3 active-users set (burst detection):
  h3:{h3_cell}:active_users → [
      {"user_id": str, "timestamp": int}, ...
  ]
  Entries expire after 1 hour (pruned on every write).
"""

from __future__ import annotations

import json
import logging
import time
import threading
from typing import Any

from config import USE_REDIS, REDIS_URL

logger = logging.getLogger(__name__)

# ── In-memory backend ─────────────────────────────────────────────────────────
_lock = threading.RLock()
_store: dict[str, Any] = {}


def _mem_get(key: str) -> Any | None:
    with _lock:
        return _store.get(key)


def _mem_set(key: str, value: Any) -> None:
    with _lock:
        _store[key] = value


# ── Redis backend ─────────────────────────────────────────────────────────────
_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis  # type: ignore
            _redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            _redis_client.ping()
            logger.info(f"Connected to Redis at {REDIS_URL}")
        except Exception as exc:
            logger.error(f"Redis connection failed: {exc} — falling back to in-memory store.")
            _redis_client = None
    return _redis_client


def _redis_get(key: str) -> Any | None:
    r = _get_redis()
    if r is None:
        return _mem_get(key)
    raw = r.get(key)
    return json.loads(raw) if raw else None


def _redis_set(key: str, value: Any) -> None:
    r = _get_redis()
    if r is None:
        _mem_set(key, value)
        return
    r.set(key, json.dumps(value))


# ── Public API ─────────────────────────────────────────────────────────────────

def get(key: str) -> Any | None:
    """Get a stored record by key."""
    if USE_REDIS:
        return _redis_get(key)
    return _mem_get(key)


def set(key: str, value: Any) -> None:
    """Persist a record by key (upsert)."""
    if USE_REDIS:
        _redis_set(key, value)
    else:
        _mem_set(key, value)


def get_user(user_id: str) -> dict | None:
    return get(f"user:{user_id}")


def set_user(user_id: str, data: dict) -> None:
    set(f"user:{user_id}", data)


def get_device(device_id: str) -> dict | None:
    return get(f"device:{device_id}")


def set_device(device_id: str, data: dict) -> None:
    set(f"device:{device_id}", data)

def get_zone(h3_cell: str) -> dict | None:
    return get(f"zone_fraud:{h3_cell}")
    
def set_zone(h3_cell: str, data: dict) -> None:
    set(f"zone_fraud:{h3_cell}", data)


# ── Write helpers (append-only mutations) ────────────────────────────────────

def record_gps_ping(user_id: str, lat: float, lng: float, ts: int) -> None:
    """Append a GPS ping to user history (capped at last 500 pings)."""
    record = get_user(user_id) or _new_user_record(user_id, ts)
    record["gps_history"].append({"lat": lat, "lng": lng, "timestamp": ts})
    record["gps_history"] = record["gps_history"][-500:]  # rolling cap
    set_user(user_id, record)


def record_claim(user_id: str, amount: float, ts: int) -> None:
    """Append a new claim event to user history."""
    record = get_user(user_id) or _new_user_record(user_id, ts)
    record["claims"].append({"amount": amount, "timestamp": ts})
    set_user(user_id, record)


def record_device(user_id: str, device_id: str, ts: int) -> None:
    """Register a device event for a user and update device→users mapping.
    
    Layer A — Device Intelligence:
      Tracks device:{id} → users list.
      Sets high_share=True when >3 distinct users share the same device.
    """
    # User record
    record = get_user(user_id) or _new_user_record(user_id, ts)
    if not any(d["device_id"] == device_id for d in record["devices"]):
        record["devices"].append({"device_id": device_id, "timestamp": ts})
    set_user(user_id, record)

    # Device record — track all users, flag high sharing (>3 users)
    dev_record = get_device(device_id) or {"users": [], "high_share": False}
    if user_id not in dev_record["users"]:
        dev_record["users"].append(user_id)
    # Device Intelligence threshold: >3 distinct users → fraud signal
    dev_record["high_share"] = len(dev_record["users"]) > 3
    set_device(device_id, dev_record)


# ── H3 Burst: active_users per cell ──────────────────────────────────────────

def get_h3_active_users(h3_cell: str) -> list:
    """Return the list of active users in an H3 cell (pruned for staleness)."""
    key = f"h3:{h3_cell}:active_users"
    return get(key) or []


def record_h3_active_user(h3_cell: str, user_id: str, ts: int) -> dict:
    """Append user to H3 active-users list and return burst metadata.

    Layer B — H3 Burst Detection:
      Tracks h3:{cell}:active_users with 1-hour TTL.
      Returns {active_count, burst_detected, cluster_user_ids} so callers
      can feed the signal directly into the fraud scorer.
    """
    key = f"h3:{h3_cell}:active_users"
    users: list = get(key) or []

    # Prune entries older than 1 hour
    users = [u for u in users if ts - u["timestamp"] < 3600]

    # Upsert current user (refresh timestamp)
    users = [u for u in users if u["user_id"] != user_id]
    users.append({"user_id": user_id, "timestamp": ts})

    set(key, users)

    # Burst = multiple distinct users in the same cell within the last hour
    burst_detected = len(users) > 1
    return {
        "active_count": len(users),
        "burst_detected": burst_detected,
        "cluster_user_ids": [u["user_id"] for u in users],
    }


def record_zone_presence(h3_cell: str, user_id: str, ts: int) -> None:
    """Track users in a zone for burst detection (legacy zone_fraud key)."""
    record = get_zone(h3_cell) or {"active_riders": 0, "claim_count": 0, "burst_detected": False, "recent_users": []}
    
    # Prune old users (> 1 hr)
    recent = [u for u in record["recent_users"] if ts - u["timestamp"] < 3600]
    
    # Add new user
    if not any(u["user_id"] == user_id for u in recent):
        recent.append({"user_id": user_id, "timestamp": ts})
        
    record["recent_users"] = recent
    record["active_riders"] = len(recent)
    
    # Burst logic: > 5 distinct users in 1 min
    very_recent = [u for u in recent if ts - u["timestamp"] < 60]
    record["burst_detected"] = len(very_recent) >= 5
    
    set_zone(h3_cell, record)


def record_zone_claim(h3_cell: str) -> None:
    record = get_zone(h3_cell) or {"active_riders": 0, "claim_count": 0, "burst_detected": False, "recent_users": []}
    record["claim_count"] += 1
    # decay/reset would happen in a background task in production
    set_zone(h3_cell, record)


# ── Temporal Behavior helpers ─────────────────────────────────────────────────

def get_claims_last_24h(user_id: str, now_ts: int) -> int:
    """Return count of claims in the last 24 hours for a user.
    
    Layer C — Temporal Behavior Signal.
    """
    user_record = get_user(user_id)
    if not user_record:
        return 0
    cutoff = now_ts - 86400  # 24 hours
    return sum(1 for c in user_record.get("claims", []) if c.get("timestamp", 0) >= cutoff)

def _new_user_record(user_id: str, created_at: int) -> dict:
    return {
        "created_at": created_at,
        "devices": [],
        "claims": [],
        "gps_history": [],
        "earnings": [],
    }


# ── Demo data seeding (development / testing only) ────────────────────────────

def init_demo_data() -> None:
    """
    Seed the store with realistic demo data for 3 users so the service
    returns meaningful features out of the box during development.
    Do NOT call this in production — replace with real event streams.
    """
    now = int(time.time())
    DAY = 86400

    # ── u123: normal rider, 45-day tenure, 6 claims in 30 days ───────────────
    u123: dict = {
        "created_at": now - 45 * DAY,
        "devices": [
            {"device_id": "d456", "timestamp": now - 45 * DAY},
        ],
        "claims": [
            {"amount": 200, "timestamp": now - 28 * DAY},
            {"amount": 350, "timestamp": now - 25 * DAY},
            {"amount": 180, "timestamp": now - 20 * DAY},
            {"amount": 450, "timestamp": now - 15 * DAY},
            {"amount": 300, "timestamp": now - 8 * DAY},
            {"amount": 800, "timestamp": now - 1 * DAY},
        ],
        "gps_history": [
            {"lat": 12.9349, "lng": 77.6241, "timestamp": now - 3600},
            {"lat": 12.9351, "lng": 77.6243, "timestamp": now - 1800},
            {"lat": 12.9352, "lng": 77.6245, "timestamp": now - 300},
        ],
        "earnings": [850, 920, 780, 1050, 700, 960, 830, 890, 740, 1100],
    }
    set_user("u123", u123)
    set_device("d456", {"users": ["u123"]})

    # ── u999: high-risk rider — many devices, many claims ────────────────────
    u999: dict = {
        "created_at": now - 10 * DAY,
        "devices": [
            {"device_id": "dAAA", "timestamp": now - 10 * DAY},
            {"device_id": "dBBB", "timestamp": now - 7 * DAY},
            {"device_id": "dCCC", "timestamp": now - 5 * DAY},
            {"device_id": "dDDD", "timestamp": now - 3 * DAY},
            {"device_id": "dEEE", "timestamp": now - 1 * DAY},
        ],
        "claims": [
            {"amount": 900, "timestamp": now - 9 * DAY},
            {"amount": 950, "timestamp": now - 8 * DAY},
            {"amount": 980, "timestamp": now - 6 * DAY},
            {"amount": 1000, "timestamp": now - 4 * DAY},
            {"amount": 999, "timestamp": now - 2 * DAY},
        ],
        "gps_history": [
            {"lat": 13.0000, "lng": 77.5500, "timestamp": now - 600},
            {"lat": 12.9352, "lng": 77.6245, "timestamp": now - 60},
        ],
        "earnings": [200, 1800, 150, 2000, 100, 1900, 120, 1950],
    }
    set_user("u999", u999)
    for dev in ["dAAA", "dBBB", "dCCC", "dDDD", "dEEE"]:
        set_device(dev, {"users": ["u999"]})

    # ── u001: brand-new rider, no history ─────────────────────────────────────
    u001: dict = {
        "created_at": now - 1 * DAY,
        "devices": [{"device_id": "dNEW", "timestamp": now - 1 * DAY}],
        "claims": [],
        "gps_history": [],
        "earnings": [],
    }
    set_user("u001", u001)
    set_device("dNEW", {"users": ["u001"]})

    logger.info("Demo data seeded: u123 (normal), u999 (high-risk), u001 (new rider)")
