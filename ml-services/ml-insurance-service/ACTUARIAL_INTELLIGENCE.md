# Actuarial Intelligence & Risk Engine

This service is the mathematical core of Aegis, responsible for computing the **Loss Fraction (Lf)** through ensemble learning and deriving the **Sachet Premium** based on actuarial identities.

## Core Models

### 1. Risk Scoring (XGBoost)
- **Algorithm**: Extreme Gradient Boosting (XGBoost)
- **Objective**: Binary Classification (Disruption Probability)
- **Features**: Rainfall (Gamma-scaled), AQI (Gaussian), Demand Factor (Beta-scaled), Historical Disruption Frequency, Zone Volatility.
- **Output**: Loss Fraction ($L_f$) — the composite probability of income loss for a specific H3 cell this week.

### 2. Premium Pricing (LightGBM)
- **Algorithm**: LightGBM Regressor
- **Formula**: $Pr_{final} = E_w \times \alpha \times L_f \times C_t \times (1 + M)$
- **Affordable Risk Fraction ($\alpha$)**: Fixed at 1.5% (microinsurance benchmark).

## Failure Behavior & Safety
- **Stateful Smoothing**: Uses Redis to smooth $L_f$ fluctuations over a 60-minute rolling window.
- **Deterministic Fallback**: If inference fails, it defaults to a safe heuristic based on rainfall thresholds to ensure high availability.

## Running the Service
```bash
python check_accuracies.py  # Verify model health
uvicorn main:app --port 8000
```
