"""
services/apiris_http.py

Async-compatible HTTP helper for external API calls.

If `apiris` is installed and enabled, requests are routed through ApirisClient
for anomaly/latency intelligence. Otherwise, calls transparently fall back to
httpx.AsyncClient.
"""

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

try:
    from apiris import ApirisClient  # type: ignore
except Exception:
    ApirisClient = None  # type: ignore


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_int_set(name: str, default: set[int]) -> set[int]:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    parsed: set[int] = set()
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        try:
            parsed.add(int(item))
        except ValueError:
            continue
    return parsed or default


APIRIS_ENABLED = _env_bool("APIRIS_ENABLED", True)
APIRIS_ANOMALY_THRESHOLD = _env_float("APIRIS_ANOMALY_THRESHOLD", 0.7)
APIRIS_PREDICTED_LATENCY_MS = _env_float("APIRIS_PREDICTED_LATENCY_MS", 2000.0)
APIRIS_ADAPTIVE_RETRY_ENABLED = _env_bool("APIRIS_ADAPTIVE_RETRY_ENABLED", True)
APIRIS_ADAPTIVE_MAX_RETRIES = _env_int("APIRIS_ADAPTIVE_MAX_RETRIES", 1)
APIRIS_RETRYABLE_STATUS_CODES = _env_int_set(
    "APIRIS_RETRYABLE_STATUS_CODES",
    {408, 425, 429, 500, 502, 503, 504},
)
APIRIS_BASE_BACKOFF_MS = _env_int("APIRIS_BASE_BACKOFF_MS", 250)
APIRIS_TIMEOUT_GROWTH_FACTOR = _env_float("APIRIS_TIMEOUT_GROWTH_FACTOR", 1.5)
APIRIS_MAX_TIMEOUT_SEC = _env_float("APIRIS_MAX_TIMEOUT_SEC", 20.0)

_APIRIS_CLIENT = ApirisClient() if (APIRIS_ENABLED and ApirisClient is not None) else None


class AdaptiveAsyncClient:
    """Context manager that provides an async .get() for Apiris or httpx."""

    def __init__(self, timeout: float, source: str):
        self.timeout = timeout
        self.source = source
        self._httpx_client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        if _APIRIS_CLIENT is None:
            self._httpx_client = httpx.AsyncClient(timeout=self.timeout)
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._httpx_client is not None:
            await self._httpx_client.aclose()

    async def get(self, url: str, *, params: dict | None = None, headers: dict | None = None):
        return await self._request_with_policy(url=url, params=params, headers=headers)

    async def _request_once(
        self,
        *,
        url: str,
        params: dict | None,
        headers: dict | None,
        timeout: float,
    ) -> 'NormalizedResponse':
        if _APIRIS_CLIENT is not None:
            raw = await _apiris_get(
                _APIRIS_CLIENT,
                url=url,
                params=params,
                headers=headers,
                timeout=timeout,
                source=self.source,
            )
            return NormalizedResponse(raw=raw, url=url)

        if timeout != self.timeout:
            async with httpx.AsyncClient(timeout=timeout) as temp_client:
                raw = await temp_client.get(url, params=params, headers=headers)
                return NormalizedResponse(raw=raw, url=url)

        if self._httpx_client is None:
            self._httpx_client = httpx.AsyncClient(timeout=timeout)

        raw = await self._httpx_client.get(url, params=params, headers=headers)
        return NormalizedResponse(raw=raw, url=url)

    async def _request_with_policy(self, *, url: str, params: dict | None, headers: dict | None) -> "NormalizedResponse":
        retries = max(0, APIRIS_ADAPTIVE_MAX_RETRIES)
        attempt = 0
        timeout = max(0.1, min(self.timeout, APIRIS_MAX_TIMEOUT_SEC))
        last_error: Exception | None = None

        while attempt <= retries:
            try:
                response = await self._request_once(url=url, params=params, headers=headers, timeout=timeout)

                if not APIRIS_ADAPTIVE_RETRY_ENABLED or attempt >= retries:
                    return response

                if response.status_code not in APIRIS_RETRYABLE_STATUS_CODES:
                    return response

                predicted = _extract_cad_metric(
                    response.cad_summary,
                    "predicted_latency",
                    "latency_prediction",
                    "predictedLatency",
                )
                # Retry only when Apiris indicates heavy upstream delay or throttling status.
                if response.status_code != 429 and (
                    predicted is None or predicted < APIRIS_PREDICTED_LATENCY_MS
                ):
                    return response

                attempt += 1
                timeout = min(timeout * APIRIS_TIMEOUT_GROWTH_FACTOR, APIRIS_MAX_TIMEOUT_SEC)
                await asyncio.sleep((APIRIS_BASE_BACKOFF_MS / 1000.0) * attempt)
                logger.warning(
                    "Adaptive retry for %s (%s): attempt=%d status=%d timeout=%.1fs",
                    self.source,
                    url,
                    attempt,
                    response.status_code,
                    timeout,
                )
                continue
            except (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException) as exc:
                last_error = exc
                if not APIRIS_ADAPTIVE_RETRY_ENABLED or attempt >= retries:
                    raise
                attempt += 1
                timeout = min(timeout * APIRIS_TIMEOUT_GROWTH_FACTOR, APIRIS_MAX_TIMEOUT_SEC)
                await asyncio.sleep((APIRIS_BASE_BACKOFF_MS / 1000.0) * attempt)
                logger.warning(
                    "Adaptive timeout retry for %s (%s): attempt=%d timeout=%.1fs",
                    self.source,
                    url,
                    attempt,
                    timeout,
                )

        if last_error is not None:
            raise last_error
        raise RuntimeError(f"Failed adaptive request for {url}")


class NormalizedResponse:
    """
    Adapter that exposes a stable httpx-like interface for both Apiris and httpx responses.
    """

    def __init__(self, *, raw: Any, url: str):
        self._raw = raw
        self._inner_response = getattr(raw, "response", None)
        self._url = url
        self.cad_summary = getattr(raw, "cad_summary", None)

    @property
    def status_code(self) -> int:
        code = getattr(self._raw, "status_code", None)
        if code is not None:
            return int(code)
        inner_code = getattr(self._inner_response, "status_code", None)
        if inner_code is not None:
            return int(inner_code)
        return 200

    def json(self) -> Any:
        if hasattr(self._raw, "json"):
            return self._raw.json()
        data = getattr(self._raw, "data", None)
        if data is not None:
            return data
        if self._inner_response is not None and hasattr(self._inner_response, "json"):
            return self._inner_response.json()
        raise AttributeError("Response does not provide JSON content")

    def raise_for_status(self) -> None:
        status = self.status_code
        if status < 400:
            return

        request = getattr(self._inner_response, "request", None)
        if request is None:
            request = httpx.Request("GET", self._url)

        response = self._inner_response
        if not isinstance(response, httpx.Response):
            response = httpx.Response(status_code=status, request=request)

        raise httpx.HTTPStatusError(
            f"HTTP {status} for URL: {self._url}",
            request=request,
            response=response,
        )

    def __getattr__(self, name: str) -> Any:
        if hasattr(self._raw, name):
            return getattr(self._raw, name)
        if self._inner_response is not None and hasattr(self._inner_response, name):
            return getattr(self._inner_response, name)
        raise AttributeError(name)


async def _apiris_get(
    client: Any,
    *,
    url: str,
    params: dict | None,
    headers: dict | None,
    timeout: float,
    source: str,
):
    try:
        response = await asyncio.to_thread(
            client.get,
            url,
            params=params,
            headers=headers,
            timeout=timeout,
        )
    except Exception as exc:
        # Keep timeout handling compatible with existing asyncio/httpx callers.
        if "timeout" in str(exc).lower():
            raise asyncio.TimeoutError(f"{source} timed out") from exc
        raise

    _log_cad_summary(response, source=source, url=url)
    return response


def _log_cad_summary(response: Any, *, source: str, url: str) -> None:
    cad = getattr(response, "cad_summary", None)
    if cad is None:
        return

    anomaly = _extract_cad_metric(cad, "anomaly_score", "anomaly", "anomalyScore")
    predicted_latency = _extract_cad_metric(
        cad,
        "predicted_latency",
        "latency_prediction",
        "predictedLatency",
    )

    if anomaly is not None and anomaly >= APIRIS_ANOMALY_THRESHOLD:
        logger.warning(
            "Apiris anomaly detected for %s (%s): score=%.3f threshold=%.3f",
            source,
            url,
            anomaly,
            APIRIS_ANOMALY_THRESHOLD,
        )

    if predicted_latency is not None and predicted_latency >= APIRIS_PREDICTED_LATENCY_MS:
        logger.warning(
            "Apiris predicted high latency for %s (%s): %.0fms threshold=%.0fms",
            source,
            url,
            predicted_latency,
            APIRIS_PREDICTED_LATENCY_MS,
        )


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _extract_cad_metric(cad: Any, *names: str) -> float | None:
    if cad is None:
        return None

    for name in names:
        value = getattr(cad, name, None)
        as_float = _to_float(value)
        if as_float is not None:
            return as_float

    # Some Apiris builds expose scores as nested dict/object under `cad_scores`.
    cad_scores = getattr(cad, "cad_scores", None)
    if isinstance(cad_scores, dict):
        for name in names:
            as_float = _to_float(cad_scores.get(name))
            if as_float is not None:
                return as_float

    if cad_scores is not None:
        for name in names:
            as_float = _to_float(getattr(cad_scores, name, None))
            if as_float is not None:
                return as_float

    return None
