from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Zone(Base):
    """Geographic zones for environment monitoring and pricing."""
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    radius_km = Column(Float)
    base_risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    environment_data = relationship("EnvironmentData", back_populates="zone")
    riders = relationship("Rider", back_populates="zone")
    triggers = relationship("Trigger", back_populates="zone")

class Rider(Base):
    """Delivery workers across platforms."""
    __tablename__ = "riders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    platform = Column(String) # Zepto, Blinkit, Instamart, Dunzo
    phone_number = Column(String, unique=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    zone = relationship("Zone", back_populates="riders")
    policies = relationship("Policy", back_populates="rider")
    claims = relationship("Claim", back_populates="rider")

class Policy(Base):
    """Active insurance policies for riders."""
    __tablename__ = "policies"
    id = Column(Integer, primary_key=True, index=True)
    rider_id = Column(Integer, ForeignKey("riders.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    weekly_premium = Column(Float)
    is_active = Column(Boolean, default=True)

    # Relationships
    rider = relationship("Rider", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")

class EnvironmentData(Base):
    """Time-series environmental data fetched every 10 mins."""
    __tablename__ = "environment_data"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    temperature_c = Column(Float)
    rainfall_mm = Column(Float)
    aqi_level = Column(Float)
    pm25 = Column(Float)
    wind_speed = Column(Float)
    platform_outage_severity = Column(Float, default=0.0) # Mock API data
    platform_orders = Column(Integer, default=0)
    active_riders_count = Column(Integer, default=0)
    
    # Relationships
    zone = relationship("Zone", back_populates="environment_data")

class Trigger(Base):
    """Threshold breakages generating a potential claim."""
    __tablename__ = "triggers"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    trigger_type = Column(String) # RAINFALL, AQI, HEAT, OUTAGE
    severity = Column(Float)
    is_active_for_claims = Column(Boolean, default=True)
    
    # Relationships
    zone = relationship("Zone", back_populates="triggers")
    claims = relationship("Claim", back_populates="trigger")

class Claim(Base):
    """Claims registered against triggers."""
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    rider_id = Column(Integer, ForeignKey("riders.id"))
    policy_id = Column(Integer, ForeignKey("policies.id"))
    trigger_id = Column(Integer, ForeignKey("triggers.id"))
    status = Column(String) # PENDING, APPROVED, REJECTED, PAID
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rider = relationship("Rider", back_populates="claims")
    policy = relationship("Policy", back_populates="claims")
    trigger = relationship("Trigger", back_populates="claims")
    payout = relationship("Payout", back_populates="claim", uselist=False)
    fraud_signal = relationship("FraudSignal", back_populates="claim", uselist=False)

class Payout(Base):
    """Disbursed amounts for approved claims."""
    __tablename__ = "payouts"
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), unique=True)
    amount = Column(Float)
    transaction_id = Column(String, unique=True)
    disbursed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    claim = relationship("Claim", back_populates="payout")

class FraudSignal(Base):
    """Anomaly detection output for claims."""
    __tablename__ = "fraud_signals"
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), unique=True)
    fraud_score = Column(Float)  # From trained ML model
    is_anomaly = Column(Boolean)
    checks_failed = Column(String) # JSON string of failed checks
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    claim = relationship("Claim", back_populates="fraud_signal")

# Example Database connection code
# DATABASE_URL = "postgresql://user:password@localhost:5432/gigshield"
# engine = create_engine(DATABASE_URL)
# Base.metadata.create_all(bind=engine)
