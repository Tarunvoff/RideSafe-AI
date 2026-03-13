from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.grid_state import GridState

router = APIRouter(prefix="/grids", tags=["Grids"])


@router.get("", response_model=List[dict])
def get_all_grid_states(db: Session = Depends(get_db)):
    """
    Returns current live grid state for ALL zones.
    """
    grids = db.query(GridState).all()
    return [
        {
            "grid_id":        g.grid_id,
            "zone_id":        g.zone_id,
            "state":          g.state,
            "risk_score":     g.risk_score,
            "rainfall_mm":    g.rainfall,
            "aqi":            g.aqi,
            "temperature_c":  g.temperature,
            "active_riders":  g.active_riders,
            "platform_orders": g.platform_orders,
            "last_updated":   g.last_updated.isoformat() if g.last_updated else None,
        }
        for g in grids
    ]


@router.get("/{grid_id}")
def get_grid_state(grid_id: str, db: Session = Depends(get_db)):
    """
    Returns current live grid state for a specific H3 grid cell.
    """
    grid = db.query(GridState).filter(GridState.grid_id == grid_id).first()
    if not grid:
        raise HTTPException(status_code=404, detail=f"Grid '{grid_id}' not found")

    return {
        "grid_id":         grid.grid_id,
        "zone_id":         grid.zone_id,
        "state":           grid.state,
        "risk_score":      grid.risk_score,
        "rainfall_mm":     grid.rainfall,
        "aqi":             grid.aqi,
        "temperature_c":   grid.temperature,
        "active_riders":   grid.active_riders,
        "platform_orders": grid.platform_orders,
        "last_updated":    grid.last_updated.isoformat() if grid.last_updated else None,
    }
