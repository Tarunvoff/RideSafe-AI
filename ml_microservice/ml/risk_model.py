from sklearn.ensemble import RandomForestClassifier
import joblib

class RiskModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        
    def train(self, X, y):
        self.model.fit(X, y)

        
    def predict_proba(self, X):
        return self.model.predict_proba(X)
        
    def save(self, path):
        joblib.dump(self.model, path)
        
    def load(self, path):
        self.model = joblib.load(path)
