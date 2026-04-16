import requests
import json
import os
from dotenv import load_dotenv

def trigger_fraud_event():
    load_dotenv()
    
    # Configuration
    api_url = os.getenv("FRAUD_API_URL", "http://localhost:8000/fraud/score")
    # Use a known test driver ID if available, otherwise fallback to the hardcoded test UUID
    driver_id = os.getenv("TEST_DRIVER_ID", "aff50232-0bbe-448a-98c1-210b94d738d5")
    test_phone = os.getenv("TEST_PHONE_NUMBER", "+919600422401")

    payload = {
        "driver_id": driver_id,
        "phone_number": test_phone,
        "gps_speed": 150.0,
        "claims_last_30d": 12.0,
        "mismatch": True,
        "h3_zone_consistency": 0.1,
        "claims_last_24h": 5.0,
        "device_switch_frequency": 10.0,
        "shared_driver_count_24h": 6,
        "earnings_pattern_deviation": 5.0,
        "account_age_days": 1.0,
        "device_id_uniqueness": 0.05,
        "trigger_frequency": 5.0
    }

    print(f"--- Triggering High-Confidence Fraud Event ---")
    print(f"Target: {api_url}")
    print(f"Payload: Driver={driver_id}, Phone={test_phone}")

    try:
        resp = requests.post(api_url, json=payload)
        print(f"Response Status: {resp.status_code}")
        print("Response Body:")
        print(json.dumps(resp.json(), indent=2))
    except Exception as e:
        print(f"❌ Error communicating with API: {e}")

if __name__ == "__main__":
    trigger_fraud_event()
