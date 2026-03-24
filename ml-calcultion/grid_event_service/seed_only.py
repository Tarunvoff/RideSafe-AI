"""
seed_only.py  — Run from grid_event_service directory.
Just seeds real Bangalore zones and forces ML evaluation immediately.
"""
import sys, os, requests, json
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.zone import Zone
from app.models.grid_state import GridState
from app.models.grid_event import GridEvent
from app.utils.h3_mapper import geo_to_h3

ML_URL = "http://127.0.0.1:8000"

REAL_ZONES = [
    {"name": "Koramangala",     "lat": 12.9352, "lon": 77.6245},
    {"name": "Indiranagar",     "lat": 12.9784, "lon": 77.6408},
    {"name": "HSR Layout",      "lat": 12.9116, "lon": 77.6389},
    {"name": "Whitefield",      "lat": 12.9698, "lon": 77.7499},
    {"name": "Electronic City", "lat": 12.8399, "lon": 77.6770},
    {"name": "Marathahalli",    "lat": 12.9562, "lon": 77.7014},
    {"name": "Hebbal",          "lat": 13.0350, "lon": 77.5970},
    {"name": "JP Nagar",        "lat": 12.9063, "lon": 77.5857},
]

def seed():
    db = SessionLocal()
    try:
        existing_names = {z.name for z in db.query(Zone).all()}
        
        # ── Seed clean zones ──────────────────────────────────────────────────────
        print("🌱 Seeding real Bangalore zones...")
        seeded = []
        for z in REAL_ZONES:
            if z["name"] in existing_names:
                continue
            grid_id = geo_to_h3(z["lat"], z["lon"], resolution=8)
            new_zone = Zone(
                name      = z["name"],
                latitude  = z["lat"],
                longitude = z["lon"],
                grid_id   = grid_id,
            )
            # Try to fetch real Zone ID from ML just as metadata
            try:
                # We can't GET /zones from ML, but we could find it via by-name
                pass
            except:
                pass
                
            db.add(new_zone)
            seeded.append((z["name"], grid_id))

        db.commit()
        print(f"   Seeded {len(seeded)} zones.")
        
        # ── Immediately fetch live data from ML for every zone ────────────────────
        print("\n🔴 Fetching LIVE grid states from ML microservice...")
        zones = db.query(Zone).all()
        from app.services.grid_state_evaluator import evaluate_grid_state
        from datetime import datetime
        from urllib.parse import quote

        for zone in zones:
            try:
                encoded_name = quote(zone.name)
                resp = requests.get(
                    f"{ML_URL}/zone-intelligence/by-name/{encoded_name}", 
                    params={"lat": zone.latitude, "lon": zone.longitude},
                    timeout=45
                )
                if resp.status_code == 200:
                    ml_data = resp.json()
                    new_state, reasons = evaluate_grid_state(ml_data)

                    gs = GridState(
                        grid_id        = zone.grid_id,
                        zone_id        = zone.zone_id,
                        state          = new_state,
                        risk_score     = ml_data.get("disruption_probability", 0.0),
                        rainfall       = ml_data.get("rainfall", 0.0),
                        aqi            = ml_data.get("aqi", 0.0),
                        temperature    = ml_data.get("temperature", 0.0),
                        active_riders  = ml_data.get("active_riders", 0),
                        platform_orders= ml_data.get("platform_orders", 0),
                        last_updated   = datetime.utcnow(),
                    )
                    db.merge(gs)
                    db.commit()
                    print(
                        f"   ✅ [{zone.name:<20}] "
                        f"Temp={ml_data.get('temperature')}°C  "
                        f"Rain={ml_data.get('rainfall')}mm  "
                        f"AQI={ml_data.get('aqi')}  "
                        f"→ {new_state}  (source={ml_data.get('data_source','?')})"
                    )
                else:
                    print(f"   ❌ [{zone.name}] ML returned {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                print(f"   ❌ [{zone.name}] Error: {e}")

        print("\n✅ Seed complete. Run GET /grids to see live states.")

    except Exception as e:
        db.rollback()
        print(f"❌ Failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
