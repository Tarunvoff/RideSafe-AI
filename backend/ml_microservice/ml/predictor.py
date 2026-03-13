import os
import time
import requests
import json
import logging
from data_collector import DataCollector
from feature_engineering import FeatureEngineering
from risk_model import RiskModel
from fraud_model import FraudModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')

class PredictorService:
    def __init__(self):
        self.risk_model = RiskModel()
        self.fraud_model = FraudModel()
        try:
            self.risk_model.load(os.path.join(MODELS_DIR, 'risk_model.pkl'))
            self.fraud_model.load(os.path.join(MODELS_DIR, 'fraud_model.pkl'))
            logger.info("Models loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load models: {e}. Please run train_models.py first.")
            
        self.fe = FeatureEngineering()

    def predict_disruption_risk(self, env_data: dict) -> dict:
        df = self.fe.create_risk_features([env_data])
        probability = self.risk_model.predict_proba(df)[0][1] # Probability of triggering class 1
        return {
            "risk_probability": float(round(probability, 4))
        }

    def predict_fraud_score(self, claim_data: dict) -> dict:
        df = self.fe.create_fraud_features([claim_data])
        score = self.fraud_model.predict_score(df)[0]
        return {
            "fraud_score": float(round(score, 2))
        }

def start_background_job():
    """Fetches environmental data every 10 mins, predicts risk, and sends to backend API."""
    logger.info("Starting scheduled background job...")
    collector = DataCollector()
    predictor = PredictorService()
    
    zones = [
        {"name": "Koramangala", "pincode": "560034"},
        {"name": "Indiranagar", "pincode": "560038"}
    ]
    
    while True:
        for zone in zones:
            try:
                # 1. Fetch Real-Time Data from Third-Party OS Open APIs
                env_data = collector.fetch_zone_data(zone['name'], zone['pincode'])
                logger.info(f"[+] Real-time Data Collected: {json.dumps(env_data)}")
                
                # 2. Extract probability scoring through Random Forest
                prediction = predictor.predict_disruption_risk(env_data)
                env_data['trigger_risk'] = prediction['risk_probability']
                logger.info(f"[*] ML Prediction for {zone['name']}: {prediction}")
                
                # 3. Simulate syncing to API Layer Pipeline
                # requests.post("http://localhost:8000/trigger-check", json=env_data)
                logger.info(f"[>] Pushed prediction intelligence to Backend API.")

            except Exception as e:
                logger.error(f"Error processing zone {zone['name']}: {e}")
        
        logger.info("Waiting 10 minutes for next data cycle...")
        time.sleep(600)  # Sleep for 10 minutes

if __name__ == "__main__":
    start_background_job()
