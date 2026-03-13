from sqlalchemy import Column, String, Integer, Float, DateTime
from app.database import Base
import datetime

class GridState(Base):
    __tablename__ = "grid_states"

    grid_id = Column(String, primary_key=True, index=True)
    zone_id = Column(Integer, index=True)
    state = Column(String)  # NORMAL, SLOW, HALTED, DANGEROUS
    risk_score = Column(Float)
    rainfall = Column(Float)
    aqi = Column(Float)
    temperature = Column(Float)
    active_riders = Column(Integer)
    platform_orders = Column(Integer)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
