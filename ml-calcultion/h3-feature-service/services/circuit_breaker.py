"""
services/circuit_breaker.py

A lightweight in-process circuit breaker for ML service calls.

States:
  CLOSED  → calls go through normally
  OPEN    → calls short-circuit immediately (use fallback)
  HALF    → one probe call allowed; if it succeeds → CLOSED; if it fails → OPEN

Configuration via env vars:
  CB_FAILURE_THRESHOLD  — consecutive failures before OPEN  (default: 3)
  CB_RECOVERY_TIMEOUT   — seconds before OPEN → HALF         (default: 30)
  CB_PROBE_TIMEOUT      — seconds before HALF → re-OPEN      (default: 10)

Usage:
    cb = CircuitBreaker("ml-insurance-service")
    if cb.allow_request():
        try:
            result = await call_ml(...)
            cb.record_success()
        except Exception:
            cb.record_failure()
            result = fallback_value
    else:
        result = fallback_value   # CB is open
"""

import logging
import time
import os
from enum import Enum

logger = logging.getLogger(__name__)

_CB_FAILURE_THRESHOLD = int(os.getenv("CB_FAILURE_THRESHOLD", "3"))
_CB_RECOVERY_TIMEOUT  = int(os.getenv("CB_RECOVERY_TIMEOUT",  "30"))


class _State(Enum):
    CLOSED = "CLOSED"
    OPEN   = "OPEN"
    HALF   = "HALF_OPEN"


class CircuitBreaker:
    def __init__(self, name: str):
        self.name = name
        self._state          = _State.CLOSED
        self._failures       = 0
        self._last_open_time = 0.0

    @property
    def state(self) -> str:
        return self._state.value

    def allow_request(self) -> bool:
        if self._state == _State.CLOSED:
            return True

        if self._state == _State.OPEN:
            if time.monotonic() - self._last_open_time >= _CB_RECOVERY_TIMEOUT:
                self._state = _State.HALF
                logger.info("[CB:%s] OPEN → HALF_OPEN (probe allowed)", self.name)
                return True
            return False   # still open

        # HALF_OPEN: allow one probe
        return True

    def record_success(self):
        if self._state != _State.CLOSED:
            logger.info("[CB:%s] %s → CLOSED (probe succeeded)", self.name, self._state.value)
        self._state    = _State.CLOSED
        self._failures = 0

    def record_failure(self):
        self._failures += 1
        if self._state == _State.HALF:
            # probe failed → stay/go back OPEN
            self._state          = _State.OPEN
            self._last_open_time = time.monotonic()
            logger.warning(
                "[CB:%s] HALF_OPEN → OPEN (probe failed, recovery_timeout=%ds)",
                self.name, _CB_RECOVERY_TIMEOUT
            )
            return

        if self._failures >= _CB_FAILURE_THRESHOLD:
            self._state          = _State.OPEN
            self._last_open_time = time.monotonic()
            logger.warning(
                "[CB:%s] CLOSED → OPEN after %d consecutive failures",
                self.name, self._failures
            )


# Singleton instances — one per downstream service
_breakers: dict[str, CircuitBreaker] = {}

def get_breaker(name: str) -> CircuitBreaker:
    if name not in _breakers:
        _breakers[name] = CircuitBreaker(name)
    return _breakers[name]
