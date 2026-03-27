"""
test_pipeline.py — Integration test for the full GPS → pricing pipeline.

Tests:
  1. /features endpoint directly
  2. /pipeline endpoint (GPS → H3 → features → risk-score → pricing)
  3. /health on both services

Run:
  python test_pipeline.py
"""

import httpx
import json
import sys

FEATURE_SERVICE = "http://localhost:8001"
ML_SERVICE      = "http://localhost:8000"

def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_resp(resp: httpx.Response, label: str):
    if resp.status_code == 200:
        print(f"\n✅ {label} [{resp.status_code}]")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"\n❌ {label} [{resp.status_code}]")
        print(resp.text)
        sys.exit(1)

def main():
    with httpx.Client(timeout=30.0) as client:

        # ── 1. Health checks ──────────────────────────────────────────────────
        print_section("Step 0: Health Checks")
        check_resp(client.get(f"{FEATURE_SERVICE}/health"), "Feature Service Health")
        check_resp(client.get(f"{ML_SERVICE}/health"),      "ML Service Health")

        # ── 2. /features directly ─────────────────────────────────────────────
        print_section("Step 1: H3 → Feature Vector (port 8001)")
        check_resp(
            client.post(f"{FEATURE_SERVICE}/features", json={"h3_cell": "8a2a1072b59ffff"}),
            "/features (NYC Statue of Liberty cell)"
        )

        # ── 3. /pipeline (GPS → H3 → features → risk → pricing) ─────────────
        print_section("Step 2: Full Pipeline  GPS → H3 → risk → premium  (port 8001)")
        pipeline_payload = {
            "lat": 12.9352,    # Koramangala, Bangalore
            "lng": 77.6245,
            "Ew": 8000,        # ₹8000 weekly earnings
            "Ct": 0.6,         # Coverage tier
            "M":  0.1          # Margin hint (ML may override)
        }
        print(f"\nRequest:\n{json.dumps(pipeline_payload, indent=2)}")
        check_resp(
            client.post(f"{FEATURE_SERVICE}/pipeline", json=pipeline_payload),
            "/pipeline (Koramangala, Bangalore)"
        )

        # ── 4. Cache hit test ─────────────────────────────────────────────────
        print_section("Step 3: Cache Hit Test (same call should be instant)")
        import time
        t0 = time.time()
        resp = client.post(f"{FEATURE_SERVICE}/pipeline", json=pipeline_payload)
        elapsed = round((time.time() - t0) * 1000, 1)
        print(f"\n⚡ Response time: {elapsed}ms  (< 300ms = cached)")
        check_resp(resp, "/pipeline (cached)")

        print_section("All tests passed ✅")

if __name__ == "__main__":
    main()
