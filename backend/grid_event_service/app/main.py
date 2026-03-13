import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import engine, Base
from app.api import zone_routes, grid_routes
from app.workers.grid_monitor import fetch_and_evaluate_zones

logging.basicConfig(level=logging.INFO)

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler = BackgroundScheduler()
    # Runs every 2 minutes; next_run_time=None defers the first run so startup is instant
    scheduler.add_job(fetch_and_evaluate_zones, 'interval', minutes=2, next_run_time=None)
    scheduler.start()
    logging.info("Grid Monitor Scheduler started (2-minute intervals).")
    yield
    # Shutdown
    scheduler.shutdown()
    logging.info("Grid Monitor Scheduler stopped.")

app = FastAPI(
    title="Grid Event Microservice",
    description="Spatial event engine converting environmental intelligence into grid-level operational states.",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(zone_routes.router)
app.include_router(grid_routes.router)

@app.get("/")
def root():
    return {"message": "Welcome to the GigShield Grid Event Microservice"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
