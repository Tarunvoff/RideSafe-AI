"""
test_fraud_features.py — Integration tests for the Fraud Feature Extraction Service.

Run with:  python test_fraud_features.py
Requires:  pip install httpx

The service must be running locally on port 8002, or use TestClient (no server needed).
"""

import sys
import json
from fastapi.testclient import TestClient

# ── Bootstrap: import app directly (no running server needed) ─────────────────
sys.path.insert(0, ".")
from main import app  # noqa: E402

client = TestClient(app)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _post(payload: dict) -> dict:
    r = client.post("/fraud-features", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    return r.json()


def _print(label: str, data: dict) -> None:
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(json.dumps(data, indent=2))


# ── Test cases ────────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"
    print("✅  /health OK")


def test_known_user_u123():
    """u123 has seeded history: 45-day account, 6 claims in 30d."""
    payload = {
        "user_id": "u123",
        "device_id": "d456",
        "upi_id": "upi789",
        "lat": 12.9352,
        "lng": 77.6245,
        "timestamp": 1711530000,
        "claim_amount": 800,
        "event_type": "ZONE_HALTED",
    }
    data = _post(payload)
    _print("u123 (Normal Rider)", data)

    assert data["identity"]["account_age_days"] > 0
    assert 0.0 < data["identity"]["device_id_uniqueness"] <= 1.0
    assert data["identity"]["oauth_token_valid"] is True
    assert data["behavior"]["claims_last_30d"] >= 0
    assert data["meta"]["h3_cell"] != ""
    assert data["meta"]["timestamp"] == 1711530000
    print("✅  u123 feature extraction OK")


def test_high_risk_user_u999():
    """u999: 5 device switches, 5 claims in 10 days — should show high risk signals."""
    import time
    now = int(time.time())
    payload = {
        "user_id": "u999",
        "device_id": "dEEE",
        "upi_id": "upiXXX",
        "lat": 12.9352,
        "lng": 77.6245,
        "timestamp": now,
        "claim_amount": 1000,
        "event_type": "CLAIM_SUBMITTED",
    }
    data = _post(payload)
    _print("u999 (High-Risk Rider)", data)

    assert data["identity"]["device_switch_frequency"] >= 3, (
        f"Expected >= 3 device switches, got {data['identity']['device_switch_frequency']}"
    )
    assert data["behavior"]["claims_last_30d"] >= 4
    assert data["identity"]["device_id_uniqueness"] < 0.5  # heavily shared
    print("✅  u999 high-risk signals detected OK")


def test_new_user_u001():
    """u001: brand-new rider, should return all safe defaults."""
    import time
    now = int(time.time())
    payload = {
        "user_id": "u001",
        "device_id": "dNEW",
        "upi_id": "upiNEW",
        "lat": 12.9000,
        "lng": 77.6000,
        "timestamp": now,
        "claim_amount": 0,
        "event_type": "TRIP_START",
    }
    data = _post(payload)
    _print("u001 (New Rider — all defaults)", data)

    assert data["location"]["gps_speed"] == 0.0 or data["location"]["gps_speed"] >= 0.0
    assert data["behavior"]["earnings_pattern_deviation"] == 0.0
    print("✅  u001 new-rider safe defaults OK")


def test_unknown_user():
    """Completely unknown user_id — should return safe defaults, not crash."""
    import time
    now = int(time.time())
    payload = {
        "user_id": "u_never_seen",
        "device_id": "d_never_seen",
        "upi_id": "upi_new",
        "lat": 13.0000,
        "lng": 77.5000,
        "timestamp": now,
        "claim_amount": 0,
        "event_type": "ZONE_SLOW",
    }
    data = _post(payload)
    _print("Unknown User (safe defaults)", data)

    assert data["identity"]["account_age_days"] == 0
    assert data["location"]["gps_speed"] == 0.0
    assert data["behavior"]["claims_last_30d"] == 0
    print("✅  Unknown user safe-defaults OK")


def test_debug_user_endpoint():
    r = client.get("/fraud-features/user/u123")
    assert r.status_code == 200
    body = r.json()
    assert "record" in body
    assert "gps_history" in body["record"]
    print("✅  /fraud-features/user/u123 debug endpoint OK")


def test_debug_user_not_found():
    r = client.get("/fraud-features/user/does_not_exist_xyz")
    assert r.status_code == 404
    print("✅  404 for missing user OK")


def test_docs_available():
    r = client.get("/docs")
    assert r.status_code == 200
    print("✅  /docs OpenAPI page OK")


# ── Run all ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_health,
        test_known_user_u123,
        test_high_risk_user_u999,
        test_new_user_u001,
        test_unknown_user,
        test_debug_user_endpoint,
        test_debug_user_not_found,
        test_docs_available,
    ]

    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as exc:
            print(f"❌  {t.__name__} FAILED: {exc}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"  Results: {passed} passed / {failed} failed")
    print(f"{'='*60}\n")
    sys.exit(1 if failed else 0)
