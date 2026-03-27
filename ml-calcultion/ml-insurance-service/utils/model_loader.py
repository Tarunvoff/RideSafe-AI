import os
import joblib

class ModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._load_models()
        return cls._instance

    def _load_models(self):
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        
        # Load Risk Models
        risk_models_path = os.path.join(data_dir, 'risk_xgb_models.pkl')
        if os.path.exists(risk_models_path):
            self.risk_models = joblib.load(risk_models_path)
        else:
            self.risk_models = None
            print(f"Warning: {risk_models_path} not found.")

        # Load Pricing Model
        price_model_path = os.path.join(data_dir, 'price_lgb.pkl')
        if os.path.exists(price_model_path):
            self.price_model = joblib.load(price_model_path)
        else:
            self.price_model = None
            print(f"Warning: {price_model_path} not found.")

        # Load Fraud Anomaly Model
        fraud_if_path = os.path.join(data_dir, 'fraud_if.pkl')
        if os.path.exists(fraud_if_path):
            self.fraud_anomaly_model = joblib.load(fraud_if_path)
        else:
            self.fraud_anomaly_model = None
            print(f"Warning: {fraud_if_path} not found.")

        # Load Fraud Classifier Model
        fraud_gb_path = os.path.join(data_dir, 'fraud_gb.pkl')
        if os.path.exists(fraud_gb_path):
            self.fraud_classifier_model = joblib.load(fraud_gb_path)
        else:
            self.fraud_classifier_model = None
            print(f"Warning: {fraud_gb_path} not found.")

# Singleton instance
model_loader = ModelLoader()
