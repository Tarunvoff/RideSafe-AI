import os
import random
import uuid
import time
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values
import h3

# Constants for realistic data generation
CITIES = {
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Mumbai": (19.0760, 72.8777)
}

WEATHER_TYPES = ["Clear", "Light Rain", "Heavy Rain", "Mist", "Cloudy", "Storm"]
H3_RESOLUTION = 8

def generate_telemetry_data(count=10000):
    print(f"Generating {count} synthetic telemetry rows...")
    
    # 1. Gather meaningful H3 cells from city centers
    base_cells = []
    for city, coords in CITIES.items():
        cell = h3.latlng_to_cell(coords[0], coords[1], H3_RESOLUTION)
        # Get neighbors to spread data
        neighbors = h3.grid_disk(cell, 2)
        base_cells.extend(list(neighbors))
    
    data = []
    start_time = datetime.now() - timedelta(days=7) # Last 7 days
    
    for i in range(count):
        h3_cell = random.choice(base_cells)
        
        # Create "Patterns": Heavy rain correlates with high Lf score
        weather = random.choice(WEATHER_TYPES)
        if "Rain" in weather or "Storm" in weather:
            lf_score = random.uniform(0.6, 0.95)
        else:
            lf_score = random.uniform(0.05, 0.4)
            
        timestamp = start_time + timedelta(seconds=random.randint(0, 604800))
        aqi = random.randint(30, 250)
        
        data.append((
            str(uuid.uuid4()),
            h3_cell,
            lf_score,
            weather,
            aqi,
            timestamp
        ))
        
    return data

def bulk_insert(data):
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/RideSafe-AI")
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        query = """
        INSERT INTO zone_telemetry_logs (id, h3_cell, lf_score, weather, aqi, timestamp)
        VALUES %s
        """
        
        execute_values(cur, query, data)
        conn.commit()
        print(f"Successfully committed {len(data)} rows to zone_telemetry_logs.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILED to insert data: {e}")

if __name__ == "__main__":
    # Ensure DATABASE_URL is accessible
    # (In a real scenario, we might need to parse the Prisma format if it differs slightly)
    synthetic_data = generate_telemetry_data(12000)
    bulk_insert(synthetic_data)
