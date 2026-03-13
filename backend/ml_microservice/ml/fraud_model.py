from sklearn.ensemble import IsolationForest
import joblib

class FraudModel:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        
    def train(self, X):
        self.model.fit(X)
        
    def predict_score(self, X):
        # returns anomaly score
        scores = self.model.score_samples(X)
        # Convert IsolationForest score [-0.5, 0.5] roughly to 0-100 fraud_score
        fraud_scores = []
        for s in scores:
            score = max(0, min(100, (s + 0.5) * -200)) # highly negative score means higher fraud
            fraud_scores.append(score)
        return fraud_scores
        
    def save(self, path):
        joblib.dump(self.model, path)
        
    def load(self, path):
        self.model = joblib.load(path)
