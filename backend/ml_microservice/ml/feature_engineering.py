import pandas as pd
import numpy as np
from datetime import datetime

class FeatureEngineering:
    def __init__(self):
        pass

    def create_risk_features(self, raw_data_list):
        if not raw_data_list:
            return pd.DataFrame()
        
        df = pd.DataFrame(raw_data_list)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Aggregate logic (mocking for real-time inference if history DB absent)
        df['rainfall_last_hour'] = df['rainfall']
        df['rainfall_3hr_avg'] = df['rainfall'] * 0.8
        
        df['temperature_current'] = df['temperature']
        df['aqi_current'] = df['aqi']
        df['aqi_trend'] = np.random.uniform(-10, 10, len(df)) # Mock trend delta
        
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        
        # Season logic
        cond = [
            df['month'].isin([12, 1, 2]),
            df['month'].isin([3, 4, 5]),
            df['month'].isin([6, 7, 8, 9]),
            df['month'].isin([10, 11])
        ]
        df['season'] = np.select(cond, [0, 1, 2, 3], default=0)
        
        # External scores
        df['zone_risk_score'] = 0.5
        
        features = [
            'rainfall_last_hour', 'rainfall_3hr_avg', 'temperature_current', 
            'aqi_current', 'aqi_trend', 'zone_risk_score', 'season', 
            'hour_of_day', 'day_of_week', 'month'
        ]
        return df[features]
    
    def create_fraud_features(self, claims_list):
        if not claims_list:
            return pd.DataFrame()
        
        df = pd.DataFrame(claims_list)
        features = [
            'gps_distance_from_zone', 'claim_frequency', 'delivery_activity',
            'zone_claim_density', 'device_consistency'
        ]
        return df[features]
