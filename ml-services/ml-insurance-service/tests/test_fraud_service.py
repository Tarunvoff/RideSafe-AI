import unittest

from models.schemas import DeviceInfo, FraudScoreRequest, GPSInfo, HistoryInfo
from services import fraud_service


class _ReferenceAnomalyModel:
    def decision_function(self, features):
        return [-0.8]


class _ReferenceClassifierModel:
    def predict_proba(self, features):
        return [[0.12, 0.88]]


class FraudServiceTests(unittest.TestCase):
    def setUp(self):
        fraud_service.model_loader.fraud_anomaly_model = _ReferenceAnomalyModel()
        fraud_service.model_loader.fraud_classifier_model = _ReferenceClassifierModel()
        fraud_service.model_loader.fraud_feature_names = [
            'speed_kmh',
            'claims_rejection_rate',
            'device_mismatch',
            'velocity_z',
            'claims_filed',
            'claims_rejected',
            'h3_zone_consistency',
            'delta_distance_m',
            'delta_t_s',
            'shared_driver_count_24h',
            'teleport_ratio',
            'earnings_ratio',
        ]

    def test_high_risk_claim_burst_sets_reason_and_confidence(self):
        req = FraudScoreRequest(
            gps=GPSInfo(latitude=12.97, longitude=77.59, speed=132.0, h3_zone_consistency=0.4),
            device=DeviceInfo(id='dev-1', mismatch=True, shared_driver_count_24h=7),
            history=HistoryInfo(
                claims_filed=6,
                claims_rejected=4,
                has_history_in_zone=False,
                last_12h_claims=4,
                prior_gps_points_count=1,
            ),
        )

        result = fraud_service.calculate_fraud_score(req)
        self.assertIn(result.label, ['MEDIUM', 'HIGH'])
        self.assertGreaterEqual(result.confidence, 0.65)
        self.assertTrue(result.fraud_reason in ['GPS_TELEPORT_PATTERN', 'CLAIM_BURST_12H', 'DEVICE_SHARING_CLUSTER'])

    def test_low_signal_claim_does_not_force_high_label(self):
        req = FraudScoreRequest(
            gps=GPSInfo(latitude=12.97, longitude=77.59, speed=22.0, h3_zone_consistency=0.97),
            device=DeviceInfo(id='dev-2', mismatch=False, shared_driver_count_24h=1),
            history=HistoryInfo(
                claims_filed=1,
                claims_rejected=0,
                has_history_in_zone=True,
                last_12h_claims=0,
                prior_gps_points_count=20,
            ),
        )

        result = fraud_service.calculate_fraud_score(req)
        self.assertIn(result.label, ['LOW', 'MEDIUM'])
        self.assertGreaterEqual(result.score, 0.0)
        self.assertLessEqual(result.score, 1.0)


if __name__ == '__main__':
    unittest.main()
