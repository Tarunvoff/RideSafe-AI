import numpy as np
import pandas as pd
from models.schemas import PricingRequest, PricingResponse
from utils.model_loader import model_loader
from config import ALPHA, MIN_PREMIUM, MAX_PREMIUM, MARGIN_MIN, MARGIN_MAX


def calculate_premium(request: PricingRequest) -> PricingResponse:
    Ew = request.Ew
    Lf = request.Lf
    Ct = request.Ct
    M  = request.M

    # ── FIX #3: LightGBM margin back-calculation (exact formula) ─────────────
    # predicted_premium = model.predict(X)
    # M = (predicted_premium / (Ew × α × Lf × Ct)) - 1
    # M = clamp(M, 0.08, 0.15)
    # ──────────────────────────────────────────────────────────────────────────
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

    # ── FIX #4: Premium formula + floor logic (exact sequence) ───────────────
    # Step 1: compute premium
    premium = Ew * ALPHA * Lf * Ct * (1.0 + M)

    # Step 2: if below floor → dynamically scale Ct and enforce floor
    if premium < MIN_PREMIUM:
        denom = Ew * ALPHA * Lf * (1.0 + M)
        if denom > 0:
            Ct = MIN_PREMIUM / denom
        premium = MIN_PREMIUM

    # Step 3: hard ceiling cap
    premium = min(premium, MAX_PREMIUM)
    # ──────────────────────────────────────────────────────────────────────────

    return PricingResponse(premium=round(premium, 2))
