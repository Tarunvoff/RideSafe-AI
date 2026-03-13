import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

from app.database import engine, Base, SessionLocal
from app.api import zone_routes, grid_routes
from app.workers.grid_monitor import fetch_and_evaluate_zones
from app.services.zone_service import create_zone, get_all_zones

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Real Bangalore zones (lat/lon verified) ───────────────────────────────────
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


def seed_zones():
    """Insert real zones into DB if they don't already exist."""
    db = SessionLocal()
    try:
        existing = {z.name for z in get_all_zones(db)}
        added = []
        for z in REAL_ZONES:
            if z["name"] not in existing:
                create_zone(db, z["name"], z["lat"], z["lon"])
                added.append(z["name"])
        if added:
            logger.info(f"Seeded {len(added)} new zones: {added}")
        else:
            logger.info("All zones already present — skipping seed.")
    except Exception as e:
        logger.error(f"Zone seeding failed: {e}")
    finally:
        db.close()


# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── 1. Seed real zones ────────────────────────────────────────────────────
    seed_zones()

    # ── 2. Immediately run first evaluation cycle (don't wait 2 min) ─────────
    logger.info("Running initial grid evaluation on startup...")
    try:
        fetch_and_evaluate_zones()
        logger.info(f"Initial grid evaluation complete at {datetime.utcnow().isoformat()}Z")
    except Exception as e:
        logger.error(f"Initial grid evaluation failed: {e}")

    # ── 3. Schedule background refresh every 2 minutes ───────────────────────
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_and_evaluate_zones, 'interval', minutes=2)
    scheduler.start()
    logger.info("Grid Monitor Scheduler started — refreshing every 2 minutes.")
    yield
    scheduler.shutdown()
    logger.info("Grid Monitor Scheduler stopped.")


app = FastAPI(
    title="Grid Event Microservice",
    description="Spatial event engine converting environmental intelligence into grid-level operational states.",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(zone_routes.router)
app.include_router(grid_routes.router)


@app.get("/")
def root():
    return {
        "service": "GigShield Grid Event Microservice",
        "status": "online",
        "zones_tracked": len(REAL_ZONES),
        "refresh_interval_minutes": 2,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
