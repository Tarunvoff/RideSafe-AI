from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
import datetime

class GridEvent(Base):
    __tablename__ = "grid_events"

    event_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    grid_id = Column(String, index=True)
    previous_state = Column(String)
    new_state = Column(String)
    reason = Column(String)  # stored as JSON string
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
