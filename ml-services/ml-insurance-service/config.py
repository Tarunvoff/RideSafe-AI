"""
Central configuration file for all business logic constants.
These values are sourced from the Aegis parametric insurance specification.
Change them HERE — they propagate everywhere automatically.
"""

# ──────────────────────────────────────────────────────────────────────────────
# Risk Model: Severity weights (Si) per disruption event type
# Represents the earnings impact fraction caused by each event type
# Values must be between 0.0 and 1.0
# ──────────────────────────────────────────────────────────────────────────────
SEVERITY_RAIN  = 0.6   # Rainfall disruption — highest impact on gig mobility
SEVERITY_FLOOD = 0.7   # Flood — derived from heavy rain; correlated with rain cluster
SEVERITY_AQI   = 0.4   # Poor air quality — moderate impact (reduces ride demand)
SEVERITY_TEMP  = 0.3   # Extreme temperature — lower direct impact

# Flood probability derivation: fraction of rainfall that is "flood-risk"
# Flood is triggered when rainfall exceeds a threshold (correlated event)
FLOOD_RAIN_THRESHOLD = 20.0   # mm — rainfall above this starts contributing to flood risk

# Risk level thresholds for Lf
RISK_LOW_THRESHOLD    = 0.3   # Lf < 0.3 → LOW
RISK_MEDIUM_THRESHOLD = 0.6   # Lf < 0.6 → MEDIUM, else HIGH

# ──────────────────────────────────────────────────────────────────────────────
# Pricing constants — Pr_final = Ew × α × Lf × Ct × (1 + M)
# ──────────────────────────────────────────────────────────────────────────────
ALPHA       = 0.015   # Fixed scaling constant (actuarial base rate)
MIN_PREMIUM = 15.0    # Minimum payable premium in ₹
MAX_PREMIUM = 150.0   # Maximum payable premium in ₹

# LightGBM margin bounds: M must stay in [0.08, 0.15]
MARGIN_MIN = 0.08
MARGIN_MAX = 0.15

# ──────────────────────────────────────────────────────────────────────────────
# Fraud Engine
# ──────────────────────────────────────────────────────────────────────────────
FRAUD_LABEL_LOW_THRESHOLD    = 0.3   # score < 0.3 → LOW
FRAUD_LABEL_MEDIUM_THRESHOLD = 0.6   # score < 0.6 → MEDIUM, else HIGH

# Rule engine thresholds
FRAUD_RULE_SPEED_LIMIT          = 120.0  # km/h above this → GPS spoof
FRAUD_RULE_REJECTION_RATE_LIMIT = 0.5    # >50% claims rejected → abuse pattern
FRAUD_RULE_CLAIM_FLOOD_LIMIT    = 4      # claims_filed > 4 → claim flooding

# IsolationForest anomaly normalization
# Uses standard sigmoid: 1 / (1 + exp(-5 * score))
# IF score: positive=inlier(normal), negative=outlier(anomaly)
# With scale=-5: anomalies (negative scores) → higher fraud signal
ANOMALY_SIGMOID_SCALE = -5   # Negative sign intentional: inverts IF polarity

# Normal driving speed distribution used to derive velocity_z feature
SPEED_NORMAL_MEAN  = 60.0   # km/h
SPEED_NORMAL_STDEV = 20.0

# ──────────────────────────────────────────────────────────────────────────────
# Parametric Trigger Engine
# ──────────────────────────────────────────────────────────────────────────────
TRIGGER_LF_THRESHOLD    = 0.7   # Lf must exceed this to approve
TRIGGER_FRAUD_THRESHOLD = 0.7   # fraud_score must be BELOW this to approve
TRIGGER_ZONE_HALT_STATE = "HALTED"

# Enforcement Engine
ENFORCEMENT_FRAUD_THRESHOLD = 10.0  # Temporarily lowered for diagnostics (0-100)
ENFORCEMENT_MAX_WARNINGS = 3

# Geospatial Resolution
H3_RESOLUTION = 8  # Standard resolution for Aegis risk cells

# Actuarial Clipping & Residuals
PREMIUM_MIN_CLIPPING        = 50.0   # Floor for premium calculation
PREMIUM_MAX_CLIPPING        = 300.0  # Ceiling for soft-tail calculation
PREMIUM_RESIDUAL_MULTIPLIER = 0.01   # Percentage of excess premium added back
