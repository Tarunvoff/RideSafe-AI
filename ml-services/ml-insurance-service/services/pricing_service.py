from models.schemas import PricingRequest, PricingResponse
from config import (
    ALPHA, MIN_PREMIUM, MAX_PREMIUM, MARGIN_MIN, MARGIN_MAX,
    PREMIUM_MIN_CLIPPING, PREMIUM_MAX_CLIPPING, PREMIUM_RESIDUAL_MULTIPLIER
)
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


import numpy as np
from utils.model_loader import model_loader
import pandas as pd

def calculate_premium(request: PricingRequest) -> PricingResponse:
    Ew = request.Ew
    Lf = request.Lf
    M  = request.M

    # Resolve Ct (Coverage Tier)
    Ct = _resolve_ct(getattr(request, 'platform', None), request.Ct)

    logger.info(
        "Pricing inputs: Ew=%.2f Lf=%.4f Ct=%.2f M=%.3f platform=%s",
        Ew, Lf, Ct, M, getattr(request, 'platform', 'N/A')
    )

    # Zone Multiplier = f(demand_ratio, zone_volatility)
    zone_multiplier = 1.0 + (request.demand_ratio - 1.0) * 0.1 + (request.zone_volatility * 0.2)
    zone_multiplier = max(0.8, min(2.0, zone_multiplier))

    # Inference using trained LGBM model (if available)
    if model_loader.price_model:
        try:
            # Features: ["weekly_earnings", "lf", "ct", "margin"]
            features = pd.DataFrame([[Ew, Lf, Ct, M]], columns=["weekly_earnings", "lf", "ct", "margin"])
            
            # 1. Prediction with Log-Target Inverse (np.exp)
            log_premium = model_loader.price_model.predict(features)[0]
            premium = np.exp(log_premium)
            
            # Apply zone_multiplier (model trained on base premium)
            premium *= zone_multiplier
            
            logger.debug("Model-based premium calculated: %.2f", premium)
        except Exception as e:
            logger.error("Pricing model inference failed: %s. Falling back to formula.", e)
            premium = Ew * ALPHA * Lf * Ct * (1.0 + M) * zone_multiplier
    else:
        # Fallback to pure rule-based formula
        premium = Ew * ALPHA * Lf * Ct * (1.0 + M) * zone_multiplier

    # 4. Production-Grade Soft-Tail Clipping
    premium_hard = max(PREMIUM_MIN_CLIPPING, min(PREMIUM_MAX_CLIPPING, premium))
    premium = premium_hard + PREMIUM_RESIDUAL_MULTIPLIER * max(0, premium - PREMIUM_MAX_CLIPPING)

    logger.info("Premium computed: ₹%.2f (zone_multiplier=%.3f Ct=%.2f)", premium, zone_multiplier, Ct)
    return PricingResponse(premium=round(premium, 2), zone_multiplier=round(zone_multiplier, 3))
