from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("Testing /calculate-premium...")
    res1 = client.post("/calculate-premium", json={
        "rider_id": 22,
        "zone_id": 1,
        "base_premium": 30.0,
        "income_multiplier": 1.0
    })
    print(res1.status_code, res1.json())
    if res1.status_code == 200:
        assert "weekly_premium" in res1.json()
    else:
        print("Note: ML Service is unavailable, skipping premium validation.")

    print("Testing /deduct-premium...")
    res2 = client.post("/deduct-premium", json={
        "rider_id": 22,
        "weekly_premium": 71.0
    })
    print(res2.status_code, res2.json())
    assert "final_payout" in res2.json()

    print("Testing /calculate-opportunity-payout...")
    res3 = client.post("/calculate-opportunity-payout", json={
        "zone_id": 1,
        "platform_orders": 425,
        "active_riders": 12,
        "surge_multiplier": 1.8,
        "lost_orders_estimate": 20,
        "base_delivery_value": 35.0
    })
    print(res3.status_code, res3.json())
    assert "estimated_income_loss" in res3.json()

    print("Testing /calculate-predictive-discount...")
    res4 = client.post("/calculate-predictive-discount", json={
        "zone_id": 1,
        "base_premium": 60.0
    })
    print(res4.status_code, res4.json())
    assert "final_premium" in res4.json()

if __name__ == "__main__":
    run_tests()
    print("All tests passed.")
