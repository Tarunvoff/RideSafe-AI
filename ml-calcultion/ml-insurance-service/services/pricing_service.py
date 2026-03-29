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
    # Higher demand and higher volatility -> higher risk -> higher premium
    zone_multiplier = 1.0 + (request.demand_ratio - 1.0) * 0.1 + (request.zone_volatility * 0.2)
    zone_multiplier = max(0.8, min(2.0, zone_multiplier)) # Cap multiplier

    # Premium formula = Ew × 0.015 × Lf × Ct × (1 + M) × zone_multiplier
    # Step 1: compute premium
    premium = Ew * ALPHA * Lf * Ct * (1.0 + M) * zone_multiplier

    # Step 2: if below floor → dynamically scale Ct and enforce floor
    if premium < MIN_PREMIUM:
        denom = Ew * ALPHA * Lf * (1.0 + M) * zone_multiplier
        if denom > 0:
            Ct = MIN_PREMIUM / denom
        premium = MIN_PREMIUM

    # Step 3: hard ceiling cap
    premium = min(premium, MAX_PREMIUM)

    return PricingResponse(premium=round(premium, 2), zone_multiplier=round(zone_multiplier, 3))
