import numpy as np
import pandas as pd
from models.schemas import PricingRequest, PricingResponse
from utils.model_loader import model_loader
from config import ALPHA, MIN_PREMIUM, MAX_PREMIUM, MARGIN_MIN, MARGIN_MAX
import logging

logger = logging.getLogger(__name__)

# ── Platform → Coverage-Tier mapping  (Ct) ──────────────────────────────────
# Ct encodes the negotiated coverage fraction per platform partnership.
_PLATFORM_CT: dict[str, float] = {
    "zepto":     0.60,
    "blinkit":   0.65,
    "instamart": 0.55,
    "swiggy":    0.60,
    "zomato":    0.62,
    "uber":      0.60,
    "ola":       0.58,
}
_DEFAULT_CT = 0.60


def _resolve_ct(platform: str | None, ct_override: float | None) -> float:
    """
    Resolve the coverage tier in this priority order:
      1. Explicit Ct override (validated to be in [0.4, 0.9])
      2. Platform name lookup
      3. Default fallback (0.60)
    """
    if ct_override is not None:
        ct = float(ct_override)
        if not (0.4 <= ct <= 0.9):
            logger.warning("Ct override %.2f is outside [0.4, 0.9] — clamping", ct)
            ct = max(0.4, min(0.9, ct))
        return ct
    if platform:
        resolved = _PLATFORM_CT.get(platform.lower().strip())
        if resolved:
            logger.debug("Ct resolved from platform '%s': %.2f", platform, resolved)
            return resolved
        logger.warning("Unknown platform '%s' — using default Ct=%.2f", platform, _DEFAULT_CT)
    return _DEFAULT_CT


def calculate_premium(request: PricingRequest) -> PricingResponse:
    Ew = request.Ew
    Lf = request.Lf
    M  = request.M

    # FIX: Always resolve Ct — never allow None to propagate into the formula
    Ct = _resolve_ct(getattr(request, 'platform', None), request.Ct)

    logger.info(
        "Pricing inputs: Ew=%.2f Lf=%.4f Ct=%.2f M=%.3f platform=%s",
        Ew, Lf, Ct, M, getattr(request, 'platform', 'N/A')
    )

    if model_loader.price_model:
        # Use DataFrame to avoid LGBMRegressor warning about valid feature names
        features = pd.DataFrame([{
            'zone_base_earnings': Ew,
            'risk_fraction': Lf,
            'coverage_tier': Ct,
            'profit_margin': M
        }])
        predicted_premium = float(model_loader.price_model.predict(features)[0])
        base = Ew * ALPHA * Lf * Ct
        if base > 0:
            suggested_M = (predicted_premium / base) - 1.0
            M = max(MARGIN_MIN, min(MARGIN_MAX, suggested_M))

    # Zone Multiplier = f(demand_ratio, zone_volatility)
    zone_multiplier = 1.0 + (request.demand_ratio - 1.0) * 0.1 + (request.zone_volatility * 0.2)
    zone_multiplier = max(0.8, min(2.0, zone_multiplier))

    # Premium formula: Ew × 0.015 × Lf × Ct × (1 + M) × zone_multiplier
    premium = Ew * ALPHA * Lf * Ct * (1.0 + M) * zone_multiplier

    # Floor enforcement: if premium < MIN_PREMIUM, scale Ct up to meet floor
    if premium < MIN_PREMIUM:
        denom = Ew * ALPHA * Lf * (1.0 + M) * zone_multiplier
        if denom > 0:
            Ct = MIN_PREMIUM / denom
        premium = MIN_PREMIUM

    # Hard ceiling cap
    premium = min(premium, MAX_PREMIUM)

    logger.info("Premium computed: ₹%.2f (zone_multiplier=%.3f Ct=%.2f)", premium, zone_multiplier, Ct)
    return PricingResponse(premium=round(premium, 2), zone_multiplier=round(zone_multiplier, 3))
