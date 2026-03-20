from typing import Tuple, List

def evaluate_grid_state(ml_data: dict) -> Tuple[str, List[str]]:
    """
    Evaluates grid state based on ML intelligence data.
    Returns (state, reasons).
    """
    reasons = []
    
    aqi = ml_data.get("aqi", 0.0)
    disruption_prob = ml_data.get("disruption_probability", 0.0)
    rainfall = ml_data.get("rainfall", 0.0)
    risk_score = ml_data.get("risk_level", "LOW")
    
    if aqi > 300:
        reasons.append("HIGH_AQI")
    if disruption_prob > 0.8:
        reasons.append("HIGH_DISRUPTION_PROBABILITY")
    if rainfall > 20:
        reasons.append("HIGH_RAINFALL")
    if risk_score == "HIGH":
        reasons.append("HIGH_RISK_SCORE")

    # Determine state based on highest priority issue
    if "HIGH_AQI" in reasons:
        state = "DANGEROUS"
    elif "HIGH_DISRUPTION_PROBABILITY" in reasons:
        state = "HALTED"
    elif "HIGH_RAINFALL" in reasons:
        state = "SLOW"
    else:
        state = "NORMAL"
        
    if not reasons:
        reasons.append("NORMAL_CONDITIONS")

    return state, reasons
