def calculate_zone_risk_score(
    disruption_probability: float,
    rainfall_normalized: float,
    flood_risk_index: float,
    pollution_risk: float,
    traffic_disruption: float,
    historical_claim_rate: float
) -> float:
    """
    Calculate Zone Risk Score using weighted signals.
    formula: 
    0.30 * disruption_probability +
    0.20 * rainfall_normalized +
    0.15 * flood_risk_index +
    0.15 * pollution_risk +
    0.10 * traffic_disruption +
    0.10 * historical_claim_rate
    Output range: max 1.0
    """
    score = (
        0.30 * disruption_probability +
        0.20 * rainfall_normalized +
        0.15 * flood_risk_index +
        0.15 * pollution_risk +
        0.10 * traffic_disruption +
        0.10 * historical_claim_rate
    )
    return min(max(score, 0.0), 1.0)
