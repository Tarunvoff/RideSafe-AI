import numpy as np
import pandas as pd
import logging
import json
import os

# ── Actuarial Constants ──────────────────────────────────────────────────────
INITIAL_RESERVE = 5000000.0  # ₹50 Lakhs initial liquidity
NUM_DRIVERS = 2000
WEEKS = 52
FORECAST_PATHS = 10000

# Event Frequencies (Lambda per week)
LAMBDA_DISRUPTION = 0.08  # ~4 times a year
LAMBDA_EXTREME_RAIN = 0.04 # ~2 times a year

logger = logging.getLogger(__name__)

def validate_actuarial_solvency():
    """
    Surgically calibrates the Aegis risk pool using high-fidelity modeling.
    Determines the Ruin Probability for the current pricing engine.
    """
    print(f"Initializing Actuarial Calibration: {FORECAST_PATHS} paths...")
    
    # 1. Driver Earnings Distribution (Lognormal)
    # Mean weekly INR 5000, sigma 0.3
    earnings = np.random.lognormal(mean=np.log(5000), sigma=0.3, size=NUM_DRIVERS)
    
    # 2. Risk Factors (Uniformly distributed Lf)
    risk_factors = np.random.uniform(0.1, 0.8, size=NUM_DRIVERS)
    
    # 3. Plan Tier Factors (Ct)
    ct_active = 0.5 # Default Standard
    
    # 4. Premium Calculation (Current Algorithm)
    premiums = earnings * risk_factors * ct_active * 0.015 * 1.1 # BASE_RATE=0.015, MARGIN=1.1
    weekly_pool_inflow = np.sum(premiums)
    
    ruin_count = 0
    total_payout_history = []
    
    for s in range(FORECAST_PATHS):
        pool = INITIAL_RESERVE
        is_ruined = False
        
        for w in range(WEEKS):
            # Inflow
            pool += weekly_pool_inflow
            
            # Outflow (Disruption Trigger Events)
            # Poisson arrival for events
            num_events = np.random.poisson(LAMBDA_DISRUPTION)
            
            if num_events > 0:
                # Payout = Ew * Lf * Ct
                # We assume 20% of the fleet is in the affected zone during an event
                payout_rate = 0.20
                eligible_payouts = earnings * risk_factors * ct_active
                weekly_payout = np.sum(eligible_payouts) * payout_rate * num_events
                
                pool -= weekly_payout
            
            if pool < 0:
                is_ruined = True
                break
        
        if is_ruined:
            ruin_count += 1
            
    ruin_probability = (ruin_count / FORECAST_PATHS) * 100
    
    print("ACTUARIAL RESULTS")
    print(f"Total Forecast Paths:  {FORECAST_PATHS}")
    print(f"Ruin Events:        {ruin_count}")
    print(f"Ruin Probability:   {ruin_probability:.4f}%")
    print(f"Target Threshold:   1.0000%")
    print(f"Status:             {'VALIDATED' if ruin_probability < 1.0 else 'CALIBRATION_REQUIRED'}")
    print("----------------------------------------------------------------")
    
    result = {
        "operational_version": "v1.0.4-forensic",
        "ruin_probability": ruin_probability,
        "is_solvent": ruin_probability < 1.0,
        "recommended_ct_adjustment": 1.05 if ruin_probability > 1.0 else 1.0,
        "calibrated_at": pd.Timestamp.now().isoformat()
    }
    
    # Save for consumption by backend
    os.makedirs("data", exist_ok=True)
    with open("data/actuarial_calibration.json", "w") as f:
        json.dump(result, f, indent=2)
        
if __name__ == "__main__":
    validate_actuarial_solvency()
