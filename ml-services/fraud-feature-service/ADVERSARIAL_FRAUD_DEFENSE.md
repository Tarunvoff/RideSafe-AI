# Adversarial Fraud Defense Layer

Professional fraud rings use coordinated GPS spoofing and device cloning to drain liquidity pools. This service generates the 14-dimensional feature vector used to detect these anomalies.

## Detection Dimensions

### 1. Geospatial Integrity
- **Velocity Analysis**: Detects impossible jumps between H3 cells (teleporting).
- **H3 Consistency**: Measures the variance of pings within a zone. Genuine riders move "messily"; bots move "perfectly."

### 2. Identity & Device Profile
- **Device Uniqueness**: Tracks multiple accounts on single hardware templates.
- **Switch Frequency**: Detects account handover patterns.

### 3. Economic Behavior
- **Earnings Outliers**: Multi-hop analysis of payout destinations.
- **Burst Claims**: High-frequency filing correlated with H3 cell state changes.

## Tech Stack
- **Library**: `h3-py` for hexagonal indexing.
- **Storage**: Redis-backed feature store for multi-window aggregation.

## Running the Service
```bash
uvicorn main:app --port 8002
```
