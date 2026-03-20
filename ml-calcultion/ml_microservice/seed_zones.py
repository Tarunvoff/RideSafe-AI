"""
seed_zones.py — Run once to seed real Bangalore zones into the ML microservice DB.
Usage (from ml_microservice directory):
    ..\venv\Scripts\python.exe seed_zones.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import SessionLocal
from app.models.database import Zone

REAL_ZONES = [
    {"name": "Koramangala",     "lat": 12.9352, "lon": 77.6245, "radius_km": 3.0, "base_risk": 0.4},
    {"name": "Indiranagar",     "lat": 12.9784, "lon": 77.6408, "radius_km": 3.0, "base_risk": 0.35},
    {"name": "HSR Layout",      "lat": 12.9116, "lon": 77.6389, "radius_km": 3.5, "base_risk": 0.3},
    {"name": "Whitefield",      "lat": 12.9698, "lon": 77.7499, "radius_km": 4.0, "base_risk": 0.3},
    {"name": "Electronic City", "lat": 12.8399, "lon": 77.6770, "radius_km": 4.0, "base_risk": 0.45},
    {"name": "Marathahalli",    "lat": 12.9562, "lon": 77.7014, "radius_km": 3.0, "base_risk": 0.35},
    {"name": "Hebbal",          "lat": 13.0350, "lon": 77.5970, "radius_km": 3.0, "base_risk": 0.3},
    {"name": "JP Nagar",        "lat": 12.9063, "lon": 77.5857, "radius_km": 3.5, "base_risk": 0.3},
]


def seed():
    db = SessionLocal()
    try:
        existing = {z.name for z in db.query(Zone).all()}
        added = []
        updated = []

        for z in REAL_ZONES:
            if z["name"] in existing:
                # Update lat/lon if zone exists with wrong coords (e.g., lat=0)
                zone = db.query(Zone).filter(Zone.name == z["name"]).first()
                if zone and (zone.latitude == 0 or zone.longitude == 0 or zone.latitude is None):
                    zone.latitude  = z["lat"]
                    zone.longitude = z["lon"]
                    zone.base_risk_score = z["base_risk"]
                    zone.radius_km = z["radius_km"]
                    updated.append(z["name"])
            else:
                new_zone = Zone(
                    name=z["name"],
                    latitude=z["lat"],
                    longitude=z["lon"],
                    radius_km=z["radius_km"],
                    base_risk_score=z["base_risk"],
                )
                db.add(new_zone)
                added.append(z["name"])

        db.commit()

        print(f"\n✅ Seeding complete!")
        print(f"   Added  : {added or 'none'}")
        print(f"   Updated: {updated or 'none'}")

        print("\n📍 Current zones in DB:")
        for zone in db.query(Zone).all():
            print(f"   [{zone.id:>2}] {zone.name:<20} lat={zone.latitude}  lon={zone.longitude}")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
