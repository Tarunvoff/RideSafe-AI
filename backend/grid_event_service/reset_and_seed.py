"""
reset_and_seed.py  — Run from grid_event_service directory.
Wipes junk zones & stale grid states, then seeds real Bangalore zones,
then immediately calls the ML service to fetch live data for every zone.
"""
import sys, os, requests, json
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.zone import Zone
from app.models.grid_state import GridState
from app.models.grid_event import GridEvent
from app.utils.h3_mapper import geo_to_h3

ML_URL = "http://127.0.0.1:8000"

# Real Bangalore zones — must match ML microservice zone IDs
# We'll let ML service assign zone IDs; grid service stores its own zone_id separately
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


def reset_and_seed():
    db = SessionLocal()
    try:
        print("🧹 Clearing stale grid_events, grid_states, and junk zones...")
        # Delete in FK-safe order using raw SQL
        db.execute(__import__('sqlalchemy').text("DELETE FROM grid_events"))
        db.execute(__import__('sqlalchemy').text("DELETE FROM grid_states"))
        # Only purge junk zones (lat=0 or name='string') — keep real ones that may have FK refs
        db.execute(__import__('sqlalchemy').text(
            "DELETE FROM zones WHERE latitude = 0 OR longitude = 0 OR name = 'string'"
        ))
        db.commit()
        print("   Done.\n")

        # ── Fetch ML microservice zone IDs so we link grid service → ML correctly ──
        print("🔍 Fetching zone list from ML microservice...")
        try:
            r = requests.get(f"{ML_URL}/zones", timeout=5)
            ml_zones = {z["name"]: z["id"] for z in r.json()} if r.status_code == 200 else {}
        except Exception as e:
            ml_zones = {}
            print(f"   [WARN] Could not fetch ML zones: {e}")

        print(f"   ML zone IDs: {ml_zones}\n")

        # ── Seed clean zones ──────────────────────────────────────────────────────
        print("🌱 Seeding real Bangalore zones...")
        seeded = []
        for z in REAL_ZONES:
            grid_id = geo_to_h3(z["lat"], z["lon"], resolution=8)
            # Use ML zone ID if available; otherwise let PK auto-assign
            ml_zone_id = ml_zones.get(z["name"])
            new_zone = Zone(
                name      = z["name"],
                latitude  = z["lat"],
                longitude = z["lon"],
                grid_id   = grid_id,
            )
            if ml_zone_id:
                new_zone.zone_id = ml_zone_id   # sync with ML service
            db.add(new_zone)
            seeded.append((z["name"], grid_id, ml_zone_id))

        db.commit()
        print(f"   Seeded {len(seeded)} zones.")
        for name, gid, mid in seeded:
            print(f"   {name:<20} grid_id={gid}  ml_zone_id={mid}")

        # ── Immediately fetch live data from ML for every zone ────────────────────
        print("\n🔴 Fetching LIVE grid states from ML microservice...")
        zones = db.query(Zone).all()
        from app.services.grid_state_evaluator import evaluate_grid_state
        from datetime import datetime

        for zone in zones:
            try:
                resp = requests.get(f"{ML_URL}/zone-intelligence/{zone.zone_id}", timeout=15)
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

        print("\n✅ Reset complete. Run /grids to see live states.")

    except Exception as e:
        db.rollback()
        print(f"❌ Failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed()
