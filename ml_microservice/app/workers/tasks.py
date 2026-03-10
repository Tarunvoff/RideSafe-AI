from .celery_app import celery_app
from integrations.data_aggregator import DataAggregator
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def fetch_and_evaluate_triggers():
    """
    Scheduled task running every 10 minutes.
    Fetches env data for all active zones.
    If thresholds breached, files a Trigger and notifies claims engine.
    """
    mock_zones = [{"id": 1, "name": "Bandra", "pincode": "400050"}]
    
    # 2. Run data aggregator
    aggregator = DataAggregator()
    data = []
    try:
        for zone in mock_zones:
            record = aggregator.aggregate_zone_data(zone['name'], zone['pincode'])
            record['zone_id'] = zone['id']
            data.append(record)
        logger.info(f"Successfully fetched env data for {len(mock_zones)} zones.")
    except Exception as e:
        logger.error(f"Failed to fetch data: {str(e)}")
        return
        
    # 3. Save env data to PostgreSQL DB 
    # db.bulk_insert(EnvironmentData, data)
    
    # 4. Evaluate triggers
    for record in data:
        check_zone_thresholds.delay(record)

@celery_app.task
def check_zone_thresholds(env_record: dict):
    """
    Evaluates trigger criteria for a zone and creates an event.
    """
    thresholds_breached = []
    if env_record.get('rainfall_mm', 0) > 20.0:
        thresholds_breached.append("RAINFALL")
    if env_record.get('aqi_level', 0) > 300.0:
        thresholds_breached.append("AQI")
    if env_record.get('temperature_c', 0) > 40.0:
        thresholds_breached.append("HEAT")
        
    if thresholds_breached:
        logger.warning(f"Trigger breached for zone {env_record.get('zone_id')}: {thresholds_breached}")
        # Insert Trigger into DB
        # create_trigger(zone_id=env_record['zone_id'], types=thresholds_breached)
        
        # Initiate Claims Generation Process for impacted Riders
        trigger_claims_engine.delay(env_record['zone_id'], thresholds_breached)

@celery_app.task
def trigger_claims_engine(zone_id: int, trigger_types: list):
    """
    Identifies active policies in the impacted zone and files claims automatically.
    """
    # 1. Fetch all active policies for riders in the zone
    # policies = db.query(Policy).join(Rider).filter(Rider.zone_id == zone_id).all()
    # 2. For each policy, create a Claim with 'PENDING' status
    # 3. Dispatch claim checking against Fraud Detector
    # for claim in new_claims:
    #    evaluate_fraud.delay(claim.id)
    
    logger.info(f"Triggered parametric claims engine for zone {zone_id} for types: {trigger_types}")

@celery_app.task
def evaluate_fraud(claim_id: int):
    """
    Sends claim to fraud-score endpoint. Moves to 'APPROVED' if non-fraudulent.
    """
    # 1. Call ML Fraud Scoring API or instantiate pipeline
    # 2. Update claim status based on score
    logger.info(f"Evaluating fraud risk for Claim {claim_id}")
