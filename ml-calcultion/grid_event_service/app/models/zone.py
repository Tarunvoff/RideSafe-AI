from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Zone(Base):
    __tablename__ = "zones"

    zone_id = Column("id", Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    grid_id = Column(String, index=True)
