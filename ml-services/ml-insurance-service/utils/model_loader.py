import os
import joblib
import logging

logger = logging.getLogger(__name__)

class ModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance

    def _load_models(self):
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

        self.risk_model_version = "unavailable"
        self.fraud_model_version = "unavailable"
        
        # Load Risk Models
        risk_models_path = os.path.join(data_dir, 'risk_xgb_models.pkl')
        if os.path.exists(risk_models_path):
            risk_artifact = joblib.load(risk_models_path)
            if isinstance(risk_artifact, dict) and "model" in risk_artifact:
                self.risk_models = risk_artifact.get("model")
                self.risk_feature_names = risk_artifact.get("feature_names")
                self.risk_model_version = str(risk_artifact.get("version", "unknown"))
            else:
                self.risk_models = risk_artifact
                self.risk_feature_names = None
            logger.info("Loaded risk model from %s", risk_models_path)
        else:
            self.risk_models = None
            self.risk_feature_names = None
            logger.warning("%s not found", risk_models_path)

        # Load Pricing Model
        price_model_path = os.path.join(data_dir, 'price_lgb.pkl')
        if os.path.exists(price_model_path):
            self.price_model = joblib.load(price_model_path)
            logger.info("Loaded price model from %s", price_model_path)
        else:
            self.price_model = None
            logger.warning("%s not found", price_model_path)

        # Load Fraud Anomaly Model
        fraud_if_path = os.path.join(data_dir, 'fraud_if.pkl')
        if os.path.exists(fraud_if_path):
            self.fraud_anomaly_model = joblib.load(fraud_if_path)
            logger.info("Loaded fraud anomaly model from %s", fraud_if_path)
        else:
            self.fraud_anomaly_model = None
            logger.warning("%s not found", fraud_if_path)

        # Load Fraud Classifier Model
        fraud_gb_path = os.path.join(data_dir, 'fraud_gb.pkl')
        if os.path.exists(fraud_gb_path):
            fraud_artifact = joblib.load(fraud_gb_path)
            if isinstance(fraud_artifact, dict) and "model" in fraud_artifact:
                self.fraud_classifier_model = fraud_artifact.get("model")
                self.fraud_feature_names = fraud_artifact.get("feature_names")
                self.fraud_model_version = str(fraud_artifact.get("version", "unknown"))
            else:
                self.fraud_classifier_model = fraud_artifact
                self.fraud_feature_names = None
            logger.info("Loaded fraud classifier model from %s", fraud_gb_path)
        else:
            self.fraud_classifier_model = None
            self.fraud_feature_names = None
            logger.warning("%s not found", fraud_gb_path)

# Singleton instance
model_loader = ModelLoader()
