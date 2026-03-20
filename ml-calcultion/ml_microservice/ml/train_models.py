import os
import pandas as pd
import numpy as np
from feature_engineering import FeatureEngineering
from risk_model import RiskModel
from fraud_model import FraudModel

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

def generate_historical_risk_data(samples=5000):
    np.random.seed(42)
    raw_data = []
    for _ in range(samples):
        timestamp = pd.Timestamp('2026-01-01') + pd.Timedelta(hours=np.random.randint(0, 24*365))
        raw_data.append({
            "zone": "Koramangala",
            "rainfall": np.random.exponential(5),
            "temperature": np.random.normal(30, 5),
            "humidity": np.random.uniform(40, 90),
            "aqi": np.random.uniform(50, 400),
            "pm25": np.random.uniform(10, 200),
            "pm10": np.random.uniform(20, 300),
            "timestamp": timestamp.isoformat()
        })
    return raw_data

def generate_historical_fraud_data(samples=5000):
    np.random.seed(42)
    raw_claims = []
    for i in range(samples):
        is_fraud = i < int(samples * 0.05) # 5% fraud probability generator
        if is_fraud:
            raw_claims.append({
                'gps_distance_from_zone': np.random.uniform(10, 50),
                'claim_frequency': np.random.uniform(5, 20),
                'delivery_activity': np.random.uniform(0, 5),
                'zone_claim_density': np.random.uniform(0.5, 1.0),
                'device_consistency': np.random.uniform(0, 0.5)
            })
        else:
            raw_claims.append({
                'gps_distance_from_zone': np.random.uniform(0, 5),
                'claim_frequency': np.random.uniform(0, 3),
                'delivery_activity': np.random.uniform(10, 30),
                'zone_claim_density': np.random.uniform(0, 0.2),
                'device_consistency': np.random.uniform(0.8, 1.0)
            })
    return raw_claims

def main():
    fe = FeatureEngineering()
    
    print("Loading synthetic risk data from CSV...")
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'synthetic_gigshield_dataset.csv')
    df_raw = pd.read_csv(csv_path)
    
    # We pass it as dict strictly as the original feature engineering expects a list of dicts.
    raw_risk = df_raw.to_dict(orient='records')
    df_risk = fe.create_risk_features(raw_risk)
    
    # The label is natively the 'trigger_event'
    y_risk = df_raw['trigger_event'].values
    
    print("Training Random Forest Risk Model with realistic synthetic data...")
    risk_model = RiskModel()
    risk_model.train(df_risk, y_risk)
    risk_model.save(os.path.join(MODELS_DIR, 'risk_model.pkl'))
    print(f"Saved to {os.path.join(MODELS_DIR, 'risk_model.pkl')}")

    print("Generating historic mocked fraud claims data...")
    raw_fraud = generate_historical_fraud_data()
    df_fraud = fe.create_fraud_features(raw_fraud)
    
    print("Training Isolation Forest Anomaly Fraud Model...")
    fraud_model = FraudModel()
    fraud_model.train(df_fraud)
    fraud_model.save(os.path.join(MODELS_DIR, 'fraud_model.pkl'))
    print(f"Saved to {os.path.join(MODELS_DIR, 'fraud_model.pkl')}")

if __name__ == "__main__":
    main()
