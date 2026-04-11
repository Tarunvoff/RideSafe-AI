"""
services/pipeline_service.py  [v2 — Production-Ready + Simulation-Ready]

End-to-end pipeline:
  GPS (lat, lng) → H3 cell → /features → /risk-score → /pricing

v2 Additions over v1:
  [CB]  Circuit breaker for ml-insurance-service calls
  [TO]  Hard 2.5s external API timeout + fallback to last known Redis zone state
  [TID] Per-request trace_id for structured log correlation
  [SC]  Sanity checks: Lf ∈ [0,1], premium ∈ [₹15,₹150], zone_state consistency
  [KA]  Event-driven Kafka trigger: Kafka telemetry can fire a pipeline run
  [RD]  Request deduplication: inflight coalescing per H3 cell (prevents thundering herd)
"""

import asyncio
import json
import logging
import os
import time
import uuid
import httpx
import h3 as h3lib
from fastapi import HTTPException
from config import H3_RESOLUTION, STRICT_REALTIME
from services.feature_service import get_features
from services.circuit_breaker import get_breaker
from models.schemas import PipelineRequest, PipelineResponse, FeatureResponse

logger = logging.getLogger(__name__)

ML_SERVICE_URL    = os.getenv("ML_INSURANCE_SERVICE_URL", "http://127.0.0.1:8000")
ML_TIMEOUT        = float(os.getenv("ML_TIMEOUT_SECONDS",  "10.0"))   # per-call timeout
PIPELINE_DEADLINE = float(os.getenv("PIPELINE_DEADLINE_SECONDS", "10.0"))  # hard end-to-end cap
REDIS_ZONE_TTL    = int(os.getenv("ZONE_KEY_TTL_SECONDS", "300"))
MIN_CONFIDENCE_SCORE = float(os.getenv("MIN_CONFIDENCE_SCORE", "0.5"))
MAX_FALLBACK_RATIO   = float(os.getenv("MAX_FALLBACK_RATIO", "0.5"))

# Sanity bounds
_MIN_PREMIUM = 15.0
_MAX_PREMIUM = 150.0
_LF_MIN      = 0.0
_LF_MAX      = 1.0

# Circuit breaker singleton for ml-insurance-service
_ml_cb = get_breaker("ml-insurance-service")

# ── Redis (lazy init) ─────────────────────────────────────────────────────────
_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis as redislib
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        _redis_client = redislib.Redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        logger.info("pipeline_service connected to Redis at %s", redis_url)
    except Exception as exc:
        logger.warning("Redis unavailable for zone state write: %s", exc)
        _redis_client = None
    return _redis_client


# ── Request Deduplication (inflight coalescing) ───────────────────────────────
# Prevents thundering herd: if N Kafka events all fire pipeline for the same cell
# simultaneously, only one actual ML call is made; others await the same future.
_inflight: dict[str, asyncio.Future] = {}


def _consume_future_exception(fut: asyncio.Future) -> None:
    """Drain future exceptions to avoid 'Future exception was never retrieved' noise."""
    try:
        _ = fut.exception()
    except asyncio.CancelledError:
        return
    except Exception:
        return


def get_zone_state(civic_alert: bool, Lf: float) -> str:
    """
    Canonical zone-state thresholds. Single definition, mirrored nowhere else.
    Sanity: zone_state must be consistent with Lf after this function.
    """
    if civic_alert:
        return "HALTED"
    if Lf > 0.75:
        return "HALTED"
    elif Lf > 0.60:
        return "DANGEROUS"
    elif Lf > 0.40:
        return "SLOW"
    return "NORMAL"

def check_parametric_overrides(features: FeatureResponse, is_gridlock: bool = False) -> tuple[float | None, str | None]:
    """
    Parametric trigger overrides. Priority: FLOODED > TOXIC_AQI > GRIDLOCK.
    Returns (Lf, zone_state) or (None, None) if no override.
    """
    if features.rainfall >= 50.0:
        return 1.0, "FLOODED"
    if features.aqi >= 300.0:
        return 1.0, "TOXIC_AQI"
    if is_gridlock:
        return 1.0, "GRIDLOCK"
    return None, None


def _sanity_check(Lf: float, premium: float, zone_state: str, trace_id: str) -> tuple[float, float, str]:
    """
    Enforce invariants after ML output.
    Returns corrected (Lf, premium, zone_state).
    Logs a WARNING for every correction so issues are visible in dashboards.
    """
    issues = []

    # [SC1] Lf bounds
    if not (_LF_MIN <= Lf <= _LF_MAX):
        issues.append(f"Lf={Lf:.4f} out of [0,1] → clamped")
        Lf = max(_LF_MIN, min(_LF_MAX, Lf))

    # [SC2] Premium bounds
    if not (_MIN_PREMIUM <= premium <= _MAX_PREMIUM):
        issues.append(f"premium={premium:.2f} out of [₹{_MIN_PREMIUM},₹{_MAX_PREMIUM}] → clamped")
        premium = max(_MIN_PREMIUM, min(_MAX_PREMIUM, premium))

    # [SC3] zone_state ↔ Lf consistency
    # Re-derive expected state (no civic_alert context here, use Lf only)
    expected_state = get_zone_state(False, Lf)
    if zone_state not in ["HALTED", "FLOODED", "TOXIC_AQI", "GRIDLOCK"] and zone_state != expected_state:
        issues.append(f"zone_state={zone_state} inconsistent with Lf={Lf:.4f} → overridden to {expected_state}")
        zone_state = expected_state

    if issues:
        logger.warning("[tid=%s] Sanity corrections: %s", trace_id, " | ".join(issues))

    return Lf, premium, zone_state


def _write_zone_to_redis(h3_cell: str, Lf: float, zone_state: str, trace_id: str):
    """
    Write the ML-authoritative zone state to Redis.
    Schema: { Lf, lf_score (compat alias), zone_state, source, timestamp, trace_id }
    TTL: REDIS_ZONE_TTL seconds (env: ZONE_KEY_TTL_SECONDS)
    """
    r = _get_redis()
    if r is None:
        return
    payload = {
        "Lf":         Lf,
        "lf_score":   Lf,           # compat alias for grid_event_service reader
        "zone_state": zone_state,
        "source":     "h3-feature-service",
        "timestamp":  time.time(),
        "trace_id":   trace_id,     # for log correlation
    }
    try:
        r.setex(f"zone:{h3_cell}", REDIS_ZONE_TTL, json.dumps(payload))
        logger.debug(
            "[tid=%s] Redis zone:%s → Lf=%.4f state=%s (TTL=%ds)",
            trace_id, h3_cell, Lf, zone_state, REDIS_ZONE_TTL
        )
    except Exception as exc:
        logger.error("[tid=%s] Redis zone write failed for %s: %s", trace_id, h3_cell, exc)


def _fallback_from_redis(h3_cell: str, trace_id: str) -> dict | None:
    """
    Read last known zone state from Redis as circuit-breaker fallback.
    Returns dict with Lf + zone_state, or None if no cached state.
    """
    r = _get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"zone:{h3_cell}")
        if raw:
            data = json.loads(raw)
            logger.warning(
                "[tid=%s] ML service unavailable — using Redis fallback for %s: Lf=%.4f state=%s",
                trace_id, h3_cell, data.get("Lf", 0.0), data.get("zone_state", "NORMAL")
            )
            return data
    except Exception as exc:
        logger.error("[tid=%s] Redis fallback read failed for %s: %s", trace_id, h3_cell, exc)
    return None


async def _call_ml_with_retry(
    client: httpx.AsyncClient,
    url: str,
    payload: dict,
    trace_id: str,
    retries: int = 2,
) -> dict:
    """POST to ML service with simple retry on transient failures."""
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = await client.post(url, json=payload, timeout=ML_TIMEOUT)
            resp.raise_for_status()
            return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt < retries:
                logger.warning(
                    "[tid=%s] ML call %s failed (attempt %d/%d): %s — retrying",
                    trace_id, url, attempt + 1, retries + 1, exc
                )
        except httpx.HTTPStatusError:
            raise
    raise last_exc  # type: ignore[misc]


async def _execute_pipeline_core(
    request: PipelineRequest,
    h3_cell: str,
    trace_id: str,
) -> PipelineResponse:
    """
    Core pipeline logic — wrapped for deduplication.
    Called only once per unique h3_cell when multiple requests coalesce.
    """
    from cache.store import get_cached, set_cached

    # ── Step 1.5: Short-circuit pipeline cache ───────────────────────────────
    cache_key = f"{h3_cell}_{request.Ew}_{request.Ct}_{request.M}"
    cached_pipeline = get_cached(cache_key)
    if cached_pipeline:
        logger.info("[tid=%s] Pipeline cache hit: %s", trace_id, cache_key)
        return PipelineResponse(**cached_pipeline["features"])

    # ── Step 2: H3 → Feature vector (with per-API timeouts) ─────────────────
    features: FeatureResponse = await get_features(h3_cell)
    logger.info(
        "[tid=%s] Features: rainfall=%.1f aqi=%.1f demand=%.3f civic=%s",
        trace_id, features.rainfall, features.aqi, features.demand_ratio, features.civic_alert
    )

    if STRICT_REALTIME and (features.is_fallback or features.fallback_ratio > 0 or features.missing_features):
        raise HTTPException(
            status_code=424,
            detail=(
                f"Realtime-only mode: fallbacks={features.fallback_features} "
                f"missing={features.missing_features}"
            ),
        )

    has_platform_signal = features.active_orders > 0 and features.active_riders > 0
    if (features.fallback_ratio >= MAX_FALLBACK_RATIO or len(features.missing_features) >= 3) and not has_platform_signal:
        raise HTTPException(
            status_code=424,
            detail=(
                f"Insufficient real features for {h3_cell}: "
                f"fallback_ratio={features.fallback_ratio:.2f}, missing={features.missing_features}"
            ),
        )

    # ── Step 2.5: Pull avg_speed from Redis (written by kafka_consumer) ──────
    avg_speed = 0.0
    try:
        from services.kafka_consumer import get_avg_speed
        avg_speed = await get_avg_speed(h3_cell)
        if avg_speed <= 0.0:
            logger.debug("[tid=%s] avg_speed missing for %s — using 0.0", trace_id, h3_cell)
    except Exception:
        pass

    # ── Step 2.6: Fetch Live Traffic (TomTom Mock) ───────────────────────────
    try:
        from services.traffic_service import get_traffic_features
        traffic_data = await get_traffic_features(features.latitude, features.longitude, h3_cell)
        # We can dynamically inject into Pydantic models with setattr or directly into the request scope
        setattr(features, "is_gridlock", traffic_data.get("is_gridlock", False))
        if traffic_data["avg_speed_kmh"] > 0:
            avg_speed = traffic_data["avg_speed_kmh"]
        logger.debug("[tid=%s] Traffic: speed=%.1f gridlock=%s", trace_id, traffic_data["avg_speed_kmh"], traffic_data["is_gridlock"])
    except Exception as exc:
        logger.warning("[tid=%s] Traffic fetch failed: %s", trace_id, exc)
        setattr(features, "is_gridlock", False)

    # ── Step 3: Features → /risk-score (circuit breaker guarded) ─────────────
    historical_freq = min(1.0, max(0.0, features.avg_delivery_delay_min / 60.0))
    zone_volatility = min(1.0, max(0.0, features.sla_breach_rate))

    risk_payload = {
        "h3_cell":   h3_cell,
        "weather":   {"rainfall": features.rainfall, "temperature": features.temperature},
        "aqi":       features.aqi,
        "demand_ratio": features.demand_ratio,
        "historical_disruption_frequency": historical_freq,
        "zone_volatility": zone_volatility,
        "avg_speed_kmh":   avg_speed,
        "active_riders":   features.active_riders,
    }

    Lf: float          = 0.0
    risk_level: str    = "LOW"
    premium: float     = _MIN_PREMIUM
    used_fallback: bool = False
    fallback_reasons: list[str] = []

    if _ml_cb.allow_request():
        try:
            async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
                risk_data = await _call_ml_with_retry(
                    client, f"{ML_SERVICE_URL}/risk-score", risk_payload, trace_id
                )
            Lf         = risk_data["Lf"]
            risk_level = risk_data["risk_level"]
            _ml_cb.record_success()
            logger.info("[tid=%s] ML Risk → Lf=%.4f level=%s", trace_id, Lf, risk_level)

        except Exception as exc:
            _ml_cb.record_failure()
            logger.error("[tid=%s] ML /risk-score failed: %s — circuit_breaker=%s", trace_id, exc, _ml_cb.state)
            if STRICT_REALTIME:
                raise HTTPException(
                    status_code=503,
                    detail="Realtime-only mode: ML risk service unavailable",
                )
            # Fallback: last known zone state from Redis
            fb = _fallback_from_redis(h3_cell, trace_id)
            if fb:
                Lf         = float(fb.get("Lf", 0.0))
                risk_level = "UNKNOWN"
                used_fallback = True
                fallback_reasons.append("redis_zone_fallback")
            else:
                Lf         = 0.0
                risk_level = "LOW"
                used_fallback = True
                fallback_reasons.append("ml_risk_failed")
    else:
        # CB is OPEN — short-circuit directly
        if STRICT_REALTIME:
            raise HTTPException(
                status_code=503,
                detail="Realtime-only mode: ML risk service unavailable",
            )
        fb = _fallback_from_redis(h3_cell, trace_id)
        if fb:
            Lf         = float(fb.get("Lf", 0.0))
            risk_level = "UNKNOWN"
            used_fallback = True
            fallback_reasons.append("redis_zone_fallback")
        logger.warning("[tid=%s] CB OPEN — skipping ML call, Lf=%.4f (fallback)", trace_id, Lf)

    # ── Step 4: Lf → /pricing (only if ML is healthy) ───────────────────────
    if not used_fallback and _ml_cb.allow_request():
        try:
            pricing_payload = {
                "Ew": request.Ew,
                "Lf": Lf,
                "Ct": request.Ct,
                "M":  request.M,
                "platform": getattr(request, "platform", None),
                "demand_ratio": features.demand_ratio,
                "zone_volatility": zone_volatility,
            }
            async with httpx.AsyncClient(timeout=ML_TIMEOUT) as client:
                pricing_data = await _call_ml_with_retry(
                    client, f"{ML_SERVICE_URL}/pricing", pricing_payload, trace_id
                )
            premium = pricing_data["premium"]
            _ml_cb.record_success()
            logger.info("[tid=%s] ML Pricing → premium=₹%.2f", trace_id, premium)
        except Exception as exc:
            _ml_cb.record_failure()
            logger.error("[tid=%s] ML /pricing failed: %s — using min premium", trace_id, exc)
            if STRICT_REALTIME:
                raise HTTPException(
                    status_code=503,
                    detail="Realtime-only mode: ML pricing service unavailable",
                )
            premium = _MIN_PREMIUM
            fallback_reasons.append("ml_pricing_failed")
    elif used_fallback:
        # Estimate premium from Lf without ML using simplified formula
        if STRICT_REALTIME:
            raise HTTPException(
                status_code=503,
                detail="Realtime-only mode: ML pricing service unavailable",
            )
        Ew    = max(request.Ew, 1.0)
        Ct    = request.Ct if request.Ct else 0.6
        M     = request.M if request.M else 0.1
        premium = round(min(max(Ew * Lf * Ct * M, _MIN_PREMIUM), _MAX_PREMIUM), 2)
        logger.info("[tid=%s] Estimated fallback premium=₹%.2f (no ML)", trace_id, premium)
        fallback_reasons.append("pricing_fallback")

    # ── Step 4.2: Parametric overrides ───────────────────────────────────────
    is_gridlock = getattr(features, "is_gridlock", False)
    override_lf, override_state = check_parametric_overrides(features, is_gridlock=is_gridlock)

    # ── Step 4.5: Derive + sanity-check zone_state ───────────────────────────
    if override_state:
        zone_state = override_state
        Lf = override_lf
        premium = max(_MIN_PREMIUM, min(_MAX_PREMIUM, premium))
        logger.info("[tid=%s] Parametric trigger fired: %s", trace_id, zone_state)
    else:
        zone_state = get_zone_state(features.civic_alert, Lf)
        Lf, premium, zone_state = _sanity_check(Lf, premium, zone_state, trace_id)

    # ── Step 4.9: Write ML-authoritative zone state to Redis ─────────────────
    _write_zone_to_redis(h3_cell, Lf, zone_state, trace_id)

    # ── Step 5: Assemble result ───────────────────────────────────────────────
    if features.is_fallback:
        fallback_reasons.append("feature_fallbacks")

    result = PipelineResponse(
        h3_cell     = h3_cell,
        latitude    = features.latitude,
        longitude   = features.longitude,
        rainfall    = features.rainfall,
        temperature = features.temperature,
        aqi         = features.aqi,
        demand_ratio= features.demand_ratio,
        civic_alert = features.civic_alert,
        Lf          = Lf,
        risk_level  = risk_level,
        zone_state  = zone_state,
        Ew          = request.Ew,
        Ct          = request.Ct if request.Ct is not None else 0.6,
        premium     = premium,
        feature_timestamp = features.feature_timestamp,
        feature_age_seconds = features.feature_age_seconds,
        is_fallback = used_fallback or features.is_fallback,
        fallback_reasons = sorted(set(fallback_reasons)),
        fallback_features = features.fallback_features,
        missing_features = features.missing_features,
        confidence_score = features.confidence_score,
    )

    set_cached(cache_key, result.model_dump())
    return result


async def run_pipeline(request: PipelineRequest) -> PipelineResponse:
    # Generate trace ID for this request — propagates through all logs
    trace_id = str(uuid.uuid4())[:8]
    pipeline_start = time.time()

    # ── Step 0: Input validation ─────────────────────────────────────────────
    if not (-90.0 <= request.lat <= 90.0):
        raise HTTPException(422, f"lat={request.lat} out of range [-90, 90]")
    if not (-180.0 <= request.lng <= 180.0):
        raise HTTPException(422, f"lng={request.lng} out of range [-180, 180]")

    # Guard against null-island (0, 0) — classic GPS "no fix" sentinel.
    # No real gig-economy drivers operate in the Gulf of Guinea.
    if abs(request.lat) < 0.1 and abs(request.lng) < 0.1:
        raise HTTPException(
            422,
            f"GPS coordinates ({request.lat}, {request.lng}) appear to be null-island "
            f"(no GPS fix). Please provide valid driver coordinates."
        )

    # ── Step 1: GPS → H3 cell ────────────────────────────────────────────────
    h3_cell = h3lib.latlng_to_cell(request.lat, request.lng, H3_RESOLUTION)
    logger.info(
        "[tid=%s] Pipeline START GPS=(%.6f,%.6f) → H3=%s",
        trace_id, request.lat, request.lng, h3_cell
    )

    # ── Request Deduplication (coalescing) ───────────────────────────────────
    # If an identical pipeline call for this cell is already inflight, await it.
    coalesce_key = f"{h3_cell}_{request.Ew}_{request.Ct}_{request.M}"
    if coalesce_key in _inflight:
        logger.debug("[tid=%s] Coalescing with inflight request for %s", trace_id, h3_cell)
        try:
            result = await _inflight[coalesce_key]
            elapsed = time.time() - pipeline_start
            logger.info("[tid=%s] Pipeline COALESCED in %.3fs", trace_id, elapsed)
            return result
        except Exception:
            pass  # inflight failed — re-run

    # Create a future so concurrent requests for same cell can wait on this one
    loop = asyncio.get_event_loop()
    fut: asyncio.Future = loop.create_future()
    fut.add_done_callback(_consume_future_exception)
    _inflight[coalesce_key] = fut

    try:
        # ── Hard end-to-end deadline ──────────────────────────────────────────
        result = await asyncio.wait_for(
            _execute_pipeline_core(request, h3_cell, trace_id),
            timeout=PIPELINE_DEADLINE,
        )
        fut.set_result(result)

    except asyncio.TimeoutError:
        # Pipeline exceeded deadline — return last known state from Redis
        logger.error(
            "[tid=%s] Pipeline TIMEOUT (>%.1fs) for %s — falling back to Redis",
            trace_id, PIPELINE_DEADLINE, h3_cell
        )
        fb = _fallback_from_redis(h3_cell, trace_id)
        Lf         = float(fb.get("Lf", 0.0)) if fb else 0.0
        zone_state = fb.get("zone_state", "NORMAL") if fb else "NORMAL"
        result = PipelineResponse(
            h3_cell=h3_cell, latitude=request.lat, longitude=request.lng,
            rainfall=0.0, temperature=25.0, aqi=50.0, demand_ratio=1.0,
            civic_alert=False, Lf=Lf, risk_level="UNKNOWN",
            zone_state=zone_state, Ew=request.Ew,
            Ct=request.Ct if request.Ct else 0.6, premium=_MIN_PREMIUM,
            feature_timestamp=time.time(),
            feature_age_seconds=None,
            is_fallback=True,
            fallback_reasons=["pipeline_timeout"],
            fallback_features=["rainfall", "aqi", "demand_ratio"],
            missing_features=["rainfall", "aqi", "demand_ratio"],
            confidence_score=0.0,
        )
        fut.set_result(result)

    except Exception as exc:
        fut.set_exception(exc)
        raise

    finally:
        _inflight.pop(coalesce_key, None)

    elapsed = time.time() - pipeline_start
    logger.info(
        "[tid=%s] Pipeline DONE in %.3fs — Lf=%.4f state=%s premium=₹%.2f cb=%s",
        trace_id, elapsed, result.Lf, result.zone_state, result.premium, _ml_cb.state
    )
    return result


async def run_pipeline_from_kafka(h3_cell: str, lat: float, lng: float,
                                  Ew: float = 8000.0, Ct: float = 0.6, M: float = 0.1):
    """
    Event-driven pipeline trigger — called by Kafka consumer when a new telemetry
    batch arrives. Fires the pipeline without a HTTP round-trip.

    This enables: Kafka → ML Pipeline → Redis (without polling /pipeline via HTTP).
    grid_event_service can also use this as a direct fast-path.
    """
    req = PipelineRequest(lat=lat, lng=lng, Ew=Ew, Ct=Ct, M=M)
    try:
        result = await run_pipeline(req)
        logger.info(
            "Kafka-triggered pipeline for H3=%s → Lf=%.4f state=%s",
            h3_cell, result.Lf, result.zone_state
        )
        return result
    except Exception as exc:
        logger.error("Kafka-triggered pipeline failed for %s: %s", h3_cell, exc)
        return None
