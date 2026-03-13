import logging
import requests
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.zone import Zone
from app.models.grid_state import GridState
from app.models.grid_event import GridEvent
from app.services.grid_state_evaluator import evaluate_grid_state
from app.config import settings

logger = logging.getLogger(__name__)

def fetch_and_evaluate_zones():
    """
    Background worker to evaluate grid states.
    1. Fetch all zones
    2. Call ML microservice endpoint
    3. Evaluate new grid state
    4. Update database
    5. Trigger events
    """
    logger.info("Starting Grid Monitor Job.")
    db: Session = SessionLocal()
    try:
        zones = db.query(Zone).all()
        for zone in zones:
            try:
                # Auto-assign grid_id if missing (zones ingested via ML microservice lack one)
                if not zone.grid_id:
                    from app.utils.h3_mapper import geo_to_h3
                    computed = geo_to_h3(zone.latitude, zone.longitude, resolution=8)
                    zone.grid_id = computed
                    db.commit()
                    db.refresh(zone)

                response = requests.get(f"{settings.ML_SERVICE_URL}/zone-intelligence/{zone.zone_id}", timeout=3)
                if response.status_code == 200:
                    ml_data = response.json()
                    new_state, reasons = evaluate_grid_state(ml_data)
                    
                    grid_state_record = db.query(GridState).filter(GridState.grid_id == zone.grid_id).first()
                    previous_state = "NORMAL"
                    risk_score = ml_data.get("disruption_probability", 0.0)
                    
                    if grid_state_record:
                        previous_state = grid_state_record.state
                        grid_state_record.state = new_state
                        grid_state_record.risk_score = risk_score
                        grid_state_record.rainfall = ml_data.get("rainfall", 0.0)
                        grid_state_record.aqi = ml_data.get("aqi", 0.0)
                        grid_state_record.temperature = ml_data.get("temperature", 0.0)
                        grid_state_record.active_riders = ml_data.get("active_riders", 0)
                        grid_state_record.platform_orders = ml_data.get("platform_orders", 0)
                        grid_state_record.last_updated = datetime.utcnow()
                    else:
                        grid_state_record = GridState(
                            grid_id=zone.grid_id,
                            zone_id=zone.zone_id,
                            state=new_state,
                            risk_score=risk_score,
                            rainfall=ml_data.get("rainfall", 0.0),
                            aqi=ml_data.get("aqi", 0.0),
                            temperature=ml_data.get("temperature", 0.0),
                            active_riders=ml_data.get("active_riders", 0),
                            platform_orders=ml_data.get("platform_orders", 0)
                        )
                        db.add(grid_state_record)
                    
                    if previous_state != new_state:
                        # 5. Trigger events if state changed
                        event = GridEvent(
                            grid_id=zone.grid_id,
                            previous_state=previous_state,
                            new_state=new_state,
                            reason=json.dumps(reasons)
                        )
                        db.add(event)
                        
                        event_payload = {
                            "grid_id": zone.grid_id,
                            "zone_id": zone.zone_id,
                            "previous_state": previous_state,
                            "new_state": new_state,
                            "reason": reasons,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        logger.info(f"EVENT TRIGGERED: {json.dumps(event_payload)}")
                        
                else:
                    logger.warning(f"Failed to fetch ML data for zone {zone.zone_id}. Status: {response.status_code}")
                db.commit()
            except Exception as e:
                logger.error(f"Error processing zone {zone.zone_id}: {str(e)}")
                db.rollback()

    except Exception as e:
        logger.error(f"Monitor error: {str(e)}")
        db.rollback()
    finally:
        db.close()
