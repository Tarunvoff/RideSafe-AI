"""
utils/time_utils.py — Timestamp helpers.

Pure functions — no side effects.
"""

from __future__ import annotations


def seconds_between(ts_earlier: int, ts_later: int) -> float:
    """Absolute difference in seconds between two Unix timestamps."""
    return abs(ts_later - ts_earlier)


def days_between(ts_earlier: int, ts_later: int) -> float:
    """Absolute difference in days between two Unix timestamps."""
    return abs(ts_later - ts_earlier) / 86400.0


def filter_within_days(
    items: list[dict],
    now_ts: int,
    window_days: int,
    ts_key: str = "timestamp",
) -> list[dict]:
    """
    Return items whose ts_key falls within [now_ts - window_days*86400, now_ts].
    Items must be dicts with an integer Unix timestamp under ts_key.
    """
    cutoff = now_ts - window_days * 86400
    return [item for item in items if item.get(ts_key, 0) >= cutoff]


def filter_within_hours(
    items: list[dict],
    now_ts: int,
    window_hours: int,
    ts_key: str = "timestamp",
) -> list[dict]:
    """
    Return items whose ts_key falls within [now_ts - window_hours*3600, now_ts].
    """
    cutoff = now_ts - window_hours * 3600
    return [item for item in items if item.get(ts_key, 0) >= cutoff]


def get_time_bucket(timestamp: float | None = None) -> int:
    """
    Generates a deterministic time bucket key (30-min window).
    Formula: int(timestamp / 1800)
    This ensures perfect alignment across distributed Clojure/Python/TS nodes.
    """
    import time
    if timestamp is None:
        timestamp = time.time()
    return int(timestamp / 1800)
