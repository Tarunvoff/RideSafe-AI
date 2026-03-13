import pandas as pd
import numpy as np
import datetime
import random
from typing import List, Dict

ZONES = [
    {"name": "Whitefield", "lat": 12.9698, "lon": 77.7499},
    {"name": "Koramangala", "lat": 12.9343, "lon": 77.6214},
    {"name": "Indiranagar", "lat": 12.9784, "lon": 77.6408},
    {"name": "HSR Layout", "lat": 12.9121, "lon": 77.6446},
    {"name": "Electronic City", "lat": 12.8399, "lon": 77.6770},
    {"name": "Marathahalli", "lat": 12.9569, "lon": 77.7011}
]

def generate_monsoon_rainfall(month: int) -> float:
    """ Simulate heavy rainfall during Monsoon (Jun-Sep). """
    is_monsoon = month in [6, 7, 8, 9]
    if is_monsoon:
        if random.random() < 0.15: # 15% chance of heavy precipitation
            return np.random.exponential(scale=20.0) + 15.0 # Base 15 + exp decay
        elif random.random() < 0.40: # 40% chance of light/moderaterain
            return np.random.uniform(0, 15)
        return 0.0
    else:
        if random.random() < 0.05: # 5% chance outside monsoon
            return np.random.uniform(0, 5)
        return 0.0

def generate_aqi_and_pm(month: int) -> tuple[float, float]:
    """ Simulate AQI considering Winter spikes (Oct-Jan). """
    is_winter = month in [10, 11, 12, 1]
    if is_winter:
        aqi = max(50, min(500, np.random.normal(250, 60)))
        # Occasional spikes
        if random.random() < 0.05:
            aqi += np.random.uniform(50, 150)
    else:
        aqi = max(30, min(200, np.random.normal(100, 30)))
    
    pm25 = aqi * random.uniform(0.35, 0.45)
    return round(aqi, 0), round(pm25, 2)

def generate_platform_activity(hour: int, is_outage: bool, is_civic_alert: bool) -> tuple[int, int]:
    """ Peak windows 7-10am or 5-9pm. Overrides on outage or civic_alert """
    if is_outage:
        # App is down. Active riders still roaming, but zero orders assigned.
        return random.randint(0, 4), random.randint(20, 50)
        
    if is_civic_alert:
        # Both drops drastically
        return random.randint(0, 10), random.randint(0, 5)

    is_peak = (7 <= hour <= 10) or (17 <= hour <= 21)
    
    if is_peak:
        orders = random.randint(120, 200)
        riders = random.randint(40, 70)
    else:
        orders = random.randint(40, 120)
        riders = random.randint(20, 40)
        
    return orders, riders

def generate_dataset(days=365, start_date_str="2026-01-01T00:00:00"):
    start_dt = datetime.datetime.fromisoformat(start_date_str)
    
    records = []
    
    # Track stateful outage and civic alert events per zone
    active_outage_timer = {z['name']: 0 for z in ZONES}
    active_civic_timer = {z['name']: 0 for z in ZONES}
    
    for zone in ZONES:
        current_dt = start_dt
        for _ in range(int(days * 24 * 6)): # 6 intervals per hour (10 mins)
            month = current_dt.month
            hour = current_dt.hour
            
            # --- State Transitions ---
            # Evaluate civic alert triggers (rare: 1-2 per month => ~0.0003 probability per 10min tick)
            if active_civic_timer[zone['name']] <= 0 and random.random() < 0.0003:
                active_civic_timer[zone['name']] = random.randint((12 * 6), (24 * 6)) # 12 to 24 hours
            elif active_civic_timer[zone['name']] > 0:
                active_civic_timer[zone['name']] -= 1
            is_civic_alert = active_civic_timer[zone['name']] > 0

            # Evaluate platform outage (1 per 3 days => ~0.002 probability per 10min tick)
            if active_outage_timer[zone['name']] <= 0 and random.random() < 0.002:
                active_outage_timer[zone['name']] = random.randint(6, 12) # 60 to 120 mins
            elif active_outage_timer[zone['name']] > 0:
                active_outage_timer[zone['name']] -= 1
            is_outage = active_outage_timer[zone['name']] > 0

            # --- Generators ---
            rainfall = generate_monsoon_rainfall(month)
            
            # Temperature (lower during rain)
            base_temp = 32.0 + (7.0 * np.sin((hour - 8.0) / 12.0 * np.pi)) # diurnal curve higher baseline
            if rainfall > 5:
                base_temp -= 5.0
            
            # Add heatwaves mapping specifically for non-monsoon noon bringing temps to 43+
            if month in [3, 4, 5, 6, 7] and 12 <= hour <= 16 and random.random() < 0.15:
                base_temp += random.uniform(6, 10)
                
            aqi, pm25 = generate_aqi_and_pm(month)
            orders, riders = generate_platform_activity(hour, is_outage, is_civic_alert)
            
            # --- Trigger Evaluation Logic ---
            trigger_event = 0
            if (rainfall >= 35.0 or 
                base_temp >= 42.0 or 
                aqi >= 300 or 
                orders < 10 or 
                is_civic_alert):
                trigger_event = 1

            record = {
                "zone": zone['name'],
                "latitude": zone['lat'],
                "longitude": zone['lon'],
                "rainfall": round(rainfall, 2),
                "temperature": round(base_temp, 2),
                "aqi": int(aqi),
                "pm25": float(pm25),
                "platform_orders": orders,
                "active_riders": riders,
                "civic_alert": is_civic_alert,
                "timestamp": current_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                "trigger_event": trigger_event
            }
            records.append(record)
            
            # Increment by 10 mins
            current_dt += datetime.timedelta(minutes=10)

    df = pd.DataFrame(records)
    df['orders_per_rider'] = np.where(df['active_riders'] > 0, 
                                      round(df['platform_orders'] / df['active_riders'], 2), 
                                      0.0)
    return df

if __name__ == "__main__":
    print("Generating Synthetic Dataset for GigShield (365 Days @ 10 Min Intervals | 6 Zones)...")
    df = generate_dataset(days=365, start_date_str="2026-01-01T00:00:00")
    
    file_path = "synthetic_gigshield_dataset.csv"
    df.to_csv(file_path, index=False)
    
    print(f"✅ Generated {len(df)} rows.")
    print(f"✅ Trigger Events Created: {df['trigger_event'].sum()}")
    print(f"✅ Saved output to -> {file_path}")
    
    print("\nSample Output:")
    print(df.head())
