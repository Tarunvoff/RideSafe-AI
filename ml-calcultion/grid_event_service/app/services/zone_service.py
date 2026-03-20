from sqlalchemy.orm import Session
from app.models.zone import Zone
from app.utils.h3_mapper import geo_to_h3

def create_zone(db: Session, name: str, latitude: float, longitude: float) -> Zone:
    grid_id = geo_to_h3(latitude, longitude, resolution=8)
    new_zone = Zone(name=name, latitude=latitude, longitude=longitude, grid_id=grid_id)
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    return new_zone

def get_all_zones(db: Session):
    return db.query(Zone).all()
