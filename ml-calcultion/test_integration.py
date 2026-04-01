"""
test_integration.py — Full E2E Integration Test for all 4 ML Microservices

Services Under Test:
  ┌──────────────────────────────────────────────────────────────────┐
  │  ml-insurance-service    → http://127.0.0.1:8000                │
  │  h3-feature-service      → http://127.0.0.1:8004                │
  │  fraud-feature-service   → http://127.0.0.1:8002                │
  │  grid-event-service      → http://127.0.0.1:8003                │
  └──────────────────────────────────────────────────────────────────┘

Pipeline Tested:
  GPS coords
    → H3 Feature Service  (/pipeline)
      → ML Insurance Service (/risk-score + /pricing + /trigger)
    → Fraud Feature Service (/fraud-features)
      → ML Insurance Service (/fraud-score)
    → Grid Event Service (/zones/{h3_cell})

Run:
  python test_integration.py           # all tests
  python test_integration.py --quick   # health checks only
"""

import argparse
import json
import sys
import time
import requests

# ── Service URLs ─────────────────────────────────────────────────────────────
ML_URL    = "http://127.0.0.1:8000"
H3_URL    = "http://127.0.0.1:8004"
FRAUD_URL = "http://127.0.0.1:8002"
GRID_URL  = "http://127.0.0.1:8003"

# ── Test constants ─────────────────────────────────────────────────────────────
# Bangalore city-centre — valid real coords that resolve to a populated H3 cell
TEST_LAT, TEST_LNG = 12.9716, 77.5946
TEST_USER_ID   = "test_user_001"
TEST_DEVICE_ID = "test_device_001"
TEST_UPI_ID    = "testupi@okaxis"

# ── Result tracking ────────────────────────────────────────────────────────────
PASS  = "✅ PASS"
FAIL  = "❌ FAIL"
SKIP  = "⏭  SKIP"
results: list[dict] = []

TIMEOUT = 15  # seconds per request


def _post(url: str, payload: dict) -> requests.Response:
    return requests.post(url, json=payload, timeout=TIMEOUT)


def _get(url: str) -> requests.Response:
    return requests.get(url, timeout=TIMEOUT)


def record(name: str, status: str, detail: str = "", data: dict | None = None):
    icon = status
    print(f"  {icon}  {name}")
    if detail:
        print(f"          ↳ {detail}")
    if data:
        preview = json.dumps(data, indent=6)[:400]
        print(f"          ↳ Response: {preview}")
    results.append({"name": name, "status": status})


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1 — Health checks for all services
# ─────────────────────────────────────────────────────────────────────────────
def test_health_checks() -> dict[str, bool]:
    """Returns which services are alive."""
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 1 — Health Checks                            ║")
    print("╚══════════════════════════════════════════════════════╝")

    alive: dict[str, bool] = {}
    services = [
        ("ML Insurance Service   (8000)", ML_URL,    "/health"),
        ("H3 Feature Service     (8004)", H3_URL,    "/health"),
        ("Fraud Feature Service  (8002)", FRAUD_URL, "/health"),
        ("Grid Event Service     (8003)", GRID_URL,  "/health"),
    ]
    for name, base, path in services:
        try:
            r = _get(base + path)
            if r.status_code == 200:
                record(name, PASS, f"status={r.json().get('status', 'ok')}")
                alive[name] = True
            else:
                record(name, FAIL, f"HTTP {r.status_code}")
                alive[name] = False
        except Exception as exc:
            record(name, FAIL, f"Unreachable — {exc}")
            alive[name] = False

    return alive


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — ML Insurance Service (unit tests per route)
# ─────────────────────────────────────────────────────────────────────────────
def test_ml_insurance_service():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 2 — ML Insurance Service (Port 8000)         ║")
    print("╚══════════════════════════════════════════════════════╝")

    # ── 2a. Risk Score ────────────────────────────────────────────────────────
    risk_payload = {
        "h3_cell": "88283082b9fffff",
        "weather": {"rainfall": 25.0, "temperature": 34.0},
        "aqi": 120.0,
        "demand_ratio": 1.4,
        "historical_disruption_frequency": 0.6,
        "zone_volatility": 0.5,
    }
    try:
        r = _post(f"{ML_URL}/risk-score", risk_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "Lf" in body, f"Missing 'Lf' key. Got: {body}"
        assert 0.0 <= float(body["Lf"]) <= 1.0, f"Lf out of range: {body['Lf']}"
        assert "risk_level" in body, "Missing 'risk_level' key"
        record("POST /risk-score", PASS, f"Lf={body['Lf']:.4f}  level={body['risk_level']}", body)
        global_lf = body["Lf"]
    except Exception as exc:
        record("POST /risk-score", FAIL, str(exc))
        global_lf = 0.55

    # ── 2b. Pricing ───────────────────────────────────────────────────────────
    pricing_payload = {
        "Ew": 5000.0,
        "Lf": global_lf,
        "Ct": 0.6,
        "M": 0.10,
        "platform": "uber",
        "demand_ratio": 1.4,
        "zone_volatility": 0.5,
    }
    try:
        r = _post(f"{ML_URL}/pricing", pricing_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "premium" in body, f"Missing 'premium'. Got: {body}"
        assert 15.0 <= float(body["premium"]) <= 150.0, f"Premium ₹{body['premium']} out of bounds"
        record("POST /pricing", PASS, f"premium=₹{body['premium']:.2f}  zone_mult={body.get('zone_multiplier', 'N/A')}", body)
    except Exception as exc:
        record("POST /pricing", FAIL, str(exc))

    # ── 2c. Fraud Score ───────────────────────────────────────────────────────
    fraud_payload = {
        "gps": {
            "latitude": TEST_LAT,
            "longitude": TEST_LNG,
            "speed": 45.0,
            "h3_zone_consistency": 0.8,
        },
        "device": {"id": TEST_DEVICE_ID, "mismatch": False},
        "history": {"claims_filed": 2, "claims_rejected": 0, "has_history_in_zone": True},
    }
    try:
        r = _post(f"{ML_URL}/fraud-score", fraud_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "score" in body, f"Missing 'score'. Got: {body}"
        assert 0.0 <= float(body["score"]) <= 1.0, f"Fraud score out of range: {body['score']}"
        record("POST /fraud-score", PASS, f"score={body['score']:.4f}  label={body['label']}", body)
        global_fraud = body["score"]
    except Exception as exc:
        record("POST /fraud-score", FAIL, str(exc))
        global_fraud = 0.3

    # ── 2d. Trigger Engine ────────────────────────────────────────────────────
    trigger_payload = {
        "h3_cell": "88283082b9fffff",
        "fraud_score": global_fraud,
    }
    try:
        r = _post(f"{ML_URL}/trigger", trigger_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "decision" in body, f"Missing 'decision'. Got: {body}"
        assert body["decision"] in ("APPROVED", "REJECTED", "HOLD / MANUAL REVIEW"), f"Unexpected decision: {body['decision']}"
        record("POST /trigger", PASS, f"decision={body['decision']}  Lf={body.get('Lf', 'N/A')}  zone={body.get('zone_state', 'N/A')}", body)
    except Exception as exc:
        record("POST /trigger", FAIL, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — H3 Feature Service
# ─────────────────────────────────────────────────────────────────────────────
def test_h3_feature_service():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 3 — H3 Feature Service (Port 8004)           ║")
    print("╚══════════════════════════════════════════════════════╝")

    # ── 3a. Feature vector for a known H3 cell ────────────────────────────────
    feature_payload = {"h3_cell": "88283082b9fffff"}
    try:
        r = _post(f"{H3_URL}/features", feature_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        required = ["rainfall", "temperature", "humidity", "aqi", "demand_ratio"]
        for key in required:
            assert key in body, f"Missing feature key '{key}'. Got keys: {list(body.keys())}"
        record(
            "POST /features",
            PASS,
            f"rain={body['rainfall']}mm  temp={body['temperature']}°C  "
            f"aqi={body['aqi']}  demand={body['demand_ratio']}",
            body,
        )
    except Exception as exc:
        record("POST /features", FAIL, str(exc))

    # ── 3b. Cache stats ───────────────────────────────────────────────────────
    try:
        r = _get(f"{H3_URL}/features/cache-stats")
        assert r.status_code == 200, f"HTTP {r.status_code}"
        record("GET /features/cache-stats", PASS, str(r.json()))
    except Exception as exc:
        record("GET /features/cache-stats", FAIL, str(exc))

    # ── 3c. Full GPS → Insurance Pipeline (crown-jewel test) ──────────────────
    pipeline_payload = {
        "lat": TEST_LAT,
        "lng": TEST_LNG,
        "Ew": 4500.0,
        "Ct": 0.6,
    }
    try:
        t0 = time.time()
        r = _post(f"{H3_URL}/pipeline", pipeline_payload)
        latency_ms = int((time.time() - t0) * 1000)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "h3_cell" in body, f"Missing 'h3_cell'. Got: {body}"
        assert "Lf" in body, f"Missing 'Lf'. Got: {body}"
        assert "premium" in body, f"Missing 'premium'. Got: {body}"
        assert latency_ms < 2500, f"Pipeline too slow: {latency_ms}ms (SLA=2500ms)"
        record(
            "POST /pipeline (GPS → H3 → Risk → Premium)",
            PASS,
            f"h3={body['h3_cell']}  Lf={body['Lf']:.4f}  "
            f"premium=₹{body['premium']:.2f}  latency={latency_ms}ms",
            body,
        )
    except Exception as exc:
        record("POST /pipeline", FAIL, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 — Fraud Feature Service
# ─────────────────────────────────────────────────────────────────────────────
def test_fraud_feature_service():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 4 — Fraud Feature Service (Port 8002)        ║")
    print("╚══════════════════════════════════════════════════════╝")

    event_ts = int(time.time())

    # ── 4a. Extract fraud features — normal user ──────────────────────────────
    normal_payload = {
        "user_id": TEST_USER_ID,
        "device_id": TEST_DEVICE_ID,
        "upi_id": TEST_UPI_ID,
        "lat": TEST_LAT,
        "lng": TEST_LNG,
        "timestamp": event_ts,
        "claim_amount": 400.0,
        "event_type": "ZONE_HALTED",
    }
    try:
        r = _post(f"{FRAUD_URL}/fraud-features", normal_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        for section in ["identity", "location", "behavior", "meta"]:
            assert section in body, f"Missing section '{section}'. Got: {list(body.keys())}"
        record(
            "POST /fraud-features (normal user)",
            PASS,
            f"identity.account_age={body['identity']['account_age_days']}d  "
            f"location.gps_speed={body['location']['gps_speed']}  "
            f"meta.h3_cell={body['meta']['h3_cell']}",
        )
    except Exception as exc:
        record("POST /fraud-features (normal user)", FAIL, str(exc))

    # ── 4b. Fraud features — suspicious user (high claim amount, fast GPS) ────
    suspicious_payload = {
        "user_id": "suspicious_user_999",
        "device_id": "shared_device_bad",
        "upi_id": "badactor@okaxis",
        "lat": TEST_LAT + 0.01,
        "lng": TEST_LNG + 0.01,
        "timestamp": event_ts,
        "claim_amount": 9999.0,
        "event_type": "ZONE_HALTED",
    }
    try:
        r = _post(f"{FRAUD_URL}/fraud-features", suspicious_payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        record(
            "POST /fraud-features (suspicious user)",
            PASS,
            f"h3_burst={body['meta']['h3_burst_detected']}  "
            f"zone_consistency={body['location']['h3_zone_consistency']:.2f}",
        )
    except Exception as exc:
        record("POST /fraud-features (suspicious user)", FAIL, str(exc))

    # ── 4c. User record debug lookup ──────────────────────────────────────────
    try:
        r = _get(f"{FRAUD_URL}/fraud-features/user/{TEST_USER_ID}")
        assert r.status_code == 200, f"HTTP {r.status_code}"
        record("GET /fraud-features/user/{id}", PASS, f"user_id={r.json().get('user_id')}")
    except Exception as exc:
        record("GET /fraud-features/user/{id}", FAIL, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 — Grid Event Service
# ─────────────────────────────────────────────────────────────────────────────
def test_grid_event_service():
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 5 — Grid Event Service (Port 8003)           ║")
    print("╚══════════════════════════════════════════════════════╝")

    h3_cell = "88283082b9fffff"

    # ── 5a. Zone state lookup ─────────────────────────────────────────────────
    try:
        r = _get(f"{GRID_URL}/zones/{h3_cell}")
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "h3_cell" in body, f"Missing 'h3_cell'. Got: {body}"
        assert "state" in body, f"Missing 'state'. Got: {body}"
        assert "lf_score" in body, f"Missing 'lf_score'. Got: {body}"
        record(
            f"GET /zones/{h3_cell}",
            PASS,
            f"state={body['state']}  riders={body.get('active_riders', 0)}  lf={body['lf_score']:.4f}",
            body,
        )
    except Exception as exc:
        record(f"GET /zones/{{h3_cell}}", FAIL, str(exc))

    # ── 5b. Unknown cell → should return NORMAL default ───────────────────────
    try:
        r = _get(f"{GRID_URL}/zones/ffffffffffffffff")
        assert r.status_code == 200, f"HTTP {r.status_code}"
        body = r.json()
        assert body.get("state") in ("NORMAL", "UNKNOWN"), f"Unexpected state: {body}"
        record("GET /zones/unknown_cell (default fallback)", PASS, f"state={body['state']}")
    except Exception as exc:
        record("GET /zones/unknown_cell", FAIL, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 — Full end-to-end pipeline chain
# ─────────────────────────────────────────────────────────────────────────────
def test_full_pipeline_chain():
    """
    Simulates exactly what happens when a NestJS telemetry event arrives:
      GPS → H3 Pipeline → Fraud Features → Fraud Score → Trigger Decision
    """
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  PHASE 6 — Full End-To-End Pipeline Chain           ║")
    print("╚══════════════════════════════════════════════════════╝")
    print("  Simulating: NestJS Telemetry  → ML Pipeline → Trigger\n")

    ctx: dict = {}  # carry data between steps

    # Step A — H3 pipeline (GPS → premium in one call)
    try:
        t0 = time.time()
        r = _post(f"{H3_URL}/pipeline", {
            "lat": TEST_LAT, "lng": TEST_LNG, "Ew": 5000.0
        })
        latency = int((time.time() - t0) * 1000)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text}"
        ctx = r.json()
        record(
            "Step A: GPS → H3 → Risk → Premium",
            PASS,
            f"h3={ctx['h3_cell']}  Lf={ctx['Lf']:.4f}  "
            f"premium=₹{ctx['premium']:.2f}  [{latency}ms]",
        )
    except Exception as exc:
        record("Step A: GPS → H3 Pipeline", FAIL, str(exc))
        ctx = {"h3_cell": "88283082b9fffff", "Lf": 0.5, "premium": 50.0}

    # Step B — Fraud features for the same user/location
    fraud_feats: dict = {}
    try:
        r = _post(f"{FRAUD_URL}/fraud-features", {
            "user_id": TEST_USER_ID,
            "device_id": TEST_DEVICE_ID,
            "upi_id": TEST_UPI_ID,
            "lat": TEST_LAT,
            "lng": TEST_LNG,
            "timestamp": int(time.time()),
            "claim_amount": 600.0,
            "event_type": "ZONE_HALTED",
        })
        assert r.status_code == 200
        fraud_feats = r.json()
        record(
            "Step B: Fraud Feature Extraction",
            PASS,
            f"zone_consistency={fraud_feats['location']['h3_zone_consistency']:.2f}  "
            f"burst={fraud_feats['meta']['h3_burst_detected']}",
        )
    except Exception as exc:
        record("Step B: Fraud Feature Extraction", FAIL, str(exc))
        fraud_feats = {"location": {"h3_zone_consistency": 0.9, "gps_speed": 30.0}, "meta": {"h3_burst_detected": False}}

    # Step C — Fraud score from ML
    fraud_score: float = 0.2
    try:
        r = _post(f"{ML_URL}/fraud-score", {
            "gps": {
                "latitude": TEST_LAT,
                "longitude": TEST_LNG,
                "speed": fraud_feats["location"].get("gps_speed", 30.0),
                "h3_zone_consistency": fraud_feats["location"]["h3_zone_consistency"],
            },
            "device": {"id": TEST_DEVICE_ID, "mismatch": False},
            "history": {"claims_filed": 2, "claims_rejected": 0, "has_history_in_zone": True},
        })
        assert r.status_code == 200
        fs_body = r.json()
        fraud_score = fs_body["score"]
        record(
            "Step C: ML Fraud Score",
            PASS,
            f"score={fraud_score:.4f}  label={fs_body['label']}",
        )
    except Exception as exc:
        record("Step C: ML Fraud Score", FAIL, str(exc))

    # Step D — Trigger decision
    try:
        r = _post(f"{ML_URL}/trigger", {
            "h3_cell": ctx.get("h3_cell", "88283082b9fffff"),
            "fraud_score": fraud_score,
        })
        assert r.status_code == 200
        trig = r.json()
        record(
            "Step D: Parametric Trigger Decision",
            PASS,
            f"decision={trig['decision']}  Lf={trig['Lf']:.4f}  zone={trig['zone_state']}",
        )
    except Exception as exc:
        record("Step D: Trigger Decision", FAIL, str(exc))

    # Step E — Zone state from Grid Event Service
    try:
        r = _get(f"{GRID_URL}/zones/{ctx.get('h3_cell', '88283082b9fffff')}")
        assert r.status_code == 200
        zone = r.json()
        record(
            "Step E: Grid Zone State Read-Back",
            PASS,
            f"state={zone['state']}  riders={zone.get('active_riders', 0)}  lf={zone['lf_score']:.4f}",
        )
    except Exception as exc:
        record("Step E: Grid Zone State", FAIL, str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
def print_summary():
    passed  = sum(1 for r in results if r["status"] == PASS)
    failed  = sum(1 for r in results if r["status"] == FAIL)
    skipped = sum(1 for r in results if r["status"] == SKIP)
    total   = len(results)

    print("\n" + "═" * 58)
    print("  TEST SUMMARY")
    print("═" * 58)
    print(f"  Total  : {total}")
    print(f"  {PASS}  : {passed}")
    if failed:
        print(f"  {FAIL}  : {failed}")
        print("\n  Failed tests:")
        for r in results:
            if r["status"] == FAIL:
                print(f"    • {r['name']}")
    if skipped:
        print(f"  {SKIP}  : {skipped}")
    print("═" * 58)

    if failed == 0:
        print("\n  🎉 ALL TESTS PASSED — pipeline is fully operational!\n")
    else:
        print(f"\n  ⚠️  {failed} test(s) failed. Check service logs above.\n")

    return failed


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RideSafe-AI ML Microservice Integration Tests")
    parser.add_argument("--quick", action="store_true", help="Run health checks only")
    args = parser.parse_args()

    print("\n" + "═" * 58)
    print("  RideSafe-AI ML Pipeline — Integration Test Suite")
    print("  Services: ML(8000) · H3(8004) · Fraud(8002) · Grid(8003)")
    print("═" * 58)

    alive = test_health_checks()

    if not args.quick:
        if alive.get("ML Insurance Service   (8000)"):
            test_ml_insurance_service()
        else:
            print("\n  ⏭  Skipping PHASE 2 — ML Insurance Service is offline")

        if alive.get("H3 Feature Service     (8004)"):
            test_h3_feature_service()
        else:
            print("\n  ⏭  Skipping PHASE 3 — H3 Feature Service is offline")

        if alive.get("Fraud Feature Service  (8002)"):
            test_fraud_feature_service()
        else:
            print("\n  ⏭  Skipping PHASE 4 — Fraud Feature Service is offline")

        if alive.get("Grid Event Service     (8003)"):
            test_grid_event_service()
        else:
            print("\n  ⏭  Skipping PHASE 5 — Grid Event Service is offline")

        # Only run E2E chain if at least H3 + ML are alive
        if (alive.get("H3 Feature Service     (8004)")
                and alive.get("ML Insurance Service   (8000)")):
            test_full_pipeline_chain()
        else:
            print("\n  ⏭  Skipping PHASE 6 — Core services offline, can't run E2E chain")

    failed = print_summary()
    sys.exit(1 if failed else 0)
