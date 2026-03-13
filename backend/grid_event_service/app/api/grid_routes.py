from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.grid_state import GridState

router = APIRouter(prefix="/grids", tags=["Grids"])

@router.get("/{grid_id}")
def get_grid_state(grid_id: str, db: Session = Depends(get_db)):
    """
    Returns current grid state.
    """
    grid = db.query(GridState).filter(GridState.grid_id == grid_id).first()
    if not grid:
        raise HTTPException(status_code=404, detail="Grid not found")
        
    return {
        "grid_id": grid.grid_id,
        "state": grid.state,
        "risk_score": grid.risk_score,
        "active_riders": grid.active_riders
    }
