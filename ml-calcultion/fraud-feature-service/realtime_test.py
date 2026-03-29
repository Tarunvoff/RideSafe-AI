"""
realtime_test.py — Real-time Fraud Feature Extraction Test

Simulates LIVE GPS event streams hitting the Fraud Feature Service
in exactly the same way the NestJS backend would in production.

Scenarios:
  1. Normal Rider     — 5 GPS events, small claim, one device
  2. Suspicious Rider — rapid teleportation, multiple device switches
  3. Ghost Rider      — unknown user, zero history
  4. Velocity Fraud   — normal GPS then sudden 350km jump in 10s
  5. Device Sharing   — 3 different users on the same physical device

Run (service must be running on port 8002 first):
  uvicorn main:app --host 0.0.0.0 --port 8002 --reload
  python realtime_test.py
"""

import json
import sys
import time
import urllib.error
import urllib.request

# ── Config ────────────────────────────────────────────────────────────────────
# Use 127.0.0.1 explicitly — 'localhost' on Windows tries IPv6 (::1) first,
# waits ~2s for timeout, then falls back to IPv4. This caused the 2000ms SLA breach.
BASE_URL = "http://127.0.0.1:8002"

TIMEOUT  = 10.0

# Mirrors config.MAX_PLAUSIBLE_SPEED_KMH — inlined to avoid import path issues
MAX_PLAUSIBLE_SPEED_KMH: float = 200.0

# ── Colour helpers ────────────────────────────────────────────────────────────
class C:
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    RESET  = "\033[0m"

def ok(msg: str)   -> None: print(f"{C.GREEN}✅ {msg}{C.RESET}")
def warn(msg: str) -> None: print(f"{C.YELLOW}⚠️  {msg}{C.RESET}")
def err(msg: str)  -> None: print(f"{C.RED}❌ {msg}{C.RESET}")
def info(msg: str) -> None: print(f"{C.CYAN}ℹ️  {msg}{C.RESET}")

def section(title: str) -> None:
    print(f"\n{C.BOLD}{'═'*65}{C.RESET}")
    print(f"{C.BOLD}  {title}{C.RESET}")
    print(f"{C.BOLD}{'═'*65}{C.RESET}")


# ── HTTP helpers (stdlib only — no httpx required) ────────────────────────────

def _post(url: str, payload: dict) -> tuple[int, dict]:
    """POST JSON payload; returns (http_status, response_dict)."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return int(resp.status), json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return int(e.code), {"error": e.reason}
    except urllib.error.URLError as e:
        raise ConnectionError(str(e.reason)) from e


def _get(url: str) -> tuple[int, dict]:
    """GET request; returns (http_status, response_dict)."""
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return int(resp.status), json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return int(e.code), {"error": e.reason}
    except urllib.error.URLError as e:
        raise ConnectionError(str(e.reason)) from e


# ── Event sender ──────────────────────────────────────────────────────────────

def send_event(payload: dict, label: str) -> "dict | None":
    """Send a single fraud-feature POST and pretty-print the result."""
    t0: float = time.perf_counter()
    try:
        status_code, data = _post(f"{BASE_URL}/fraud-features", payload)
        latency_ms: float = round(float(time.perf_counter() - t0) * 1000.0, 1)

        if status_code == 200:
            suspicious = (
                data["identity"]["account_age_days"] < 7
                or data["behavior"]["claims_last_30d"] > 8
                or data["location"]["gps_speed"] > 120
            )
            flag = "🔴 SUSPICIOUS" if suspicious else "🟢 NORMAL"

            print(f"\n  {C.BOLD}[{label}]{C.RESET}  {flag}  ⏱ {latency_ms}ms")
            print(
                f"  ├─ Identity  : age={data['identity']['account_age_days']}d  "
                f"uniqueness={data['identity']['device_id_uniqueness']:.2f}  "
                f"switches={data['identity']['device_switch_frequency']:.0f}"
            )
            print(
                f"  ├─ Location  : speed={data['location']['gps_speed']:.1f}km/h  "
                f"cell_dist={data['location']['gps_cell_distance']:.3f}km  "
                f"consistency={data['location']['h3_zone_consistency']:.2f}"
            )
            print(
                f"  ├─ Behaviour : claims_30d={data['behavior']['claims_last_30d']}  "
                f"trigger_freq={data['behavior']['trigger_frequency']:.3f}  "
                f"earn_dev={data['behavior']['earnings_pattern_deviation']:.3f}"
            )
            print(f"  └─ H3 Cell   : {data['meta']['h3_cell']}")

            if latency_ms > 100:
                warn(f"  Latency {latency_ms}ms exceeds 100ms production SLA!")

            return data

        else:
            err(f"[{label}] HTTP {status_code}: {data}")
            return None

    except ConnectionError:
        err(f"Cannot connect to {BASE_URL} — is the service running on port 8002?")
        err("Start it: uvicorn main:app --host 0.0.0.0 --port 8002 --reload")
        sys.exit(1)


# ── Scenario 1: Normal Rider ──────────────────────────────────────────────────

def scenario_normal_rider() -> None:
    section("Scenario 1 — Normal Rider (u123) — 5 Sequential GPS Events")
    info("Simulating: Koramangala → Domlur → Indiranagar, Bangalore")

    gps_track = [
        (12.9352, 77.6245, "Koramangala"),
        (12.9369, 77.6310, "Sony World Signal"),
        (12.9401, 77.6380, "Domlur Flyover"),
        (12.9450, 77.6420, "Domlur"),
        (12.9582, 77.6408, "Indiranagar 100ft Road"),
    ]

    now = int(time.time())
    for i, (lat, lng, place) in enumerate(gps_track):
        send_event(
            {
                "user_id":      "u123",
                "device_id":    "d456",
                "upi_id":       "upi789",
                "lat":          lat,
                "lng":          lng,
                "timestamp":    now + (i * 120),
                "claim_amount": 0,
                "event_type":   "GPS_PING",
            },
            f"Ping {i+1}/5: {place}",
        )
        time.sleep(0.1)

    info("\n  → Triggering ZONE_HALTED claim at Indiranagar")
    send_event(
        {
            "user_id":      "u123",
            "device_id":    "d456",
            "upi_id":       "upi789",
            "lat":          12.9582,
            "lng":          77.6408,
            "timestamp":    now + 600,
            "claim_amount": 800,
            "event_type":   "ZONE_HALTED",
        },
        "Claim Event",
    )
    ok("Normal rider scenario complete")


# ── Scenario 2: GPS Teleportation ─────────────────────────────────────────────

def scenario_suspicious_teleport() -> None:
    section("Scenario 2 — GPS Teleportation Fraud (u999)")
    info("Bangalore → Mumbai → Delhi in 30 seconds each + new device each jump")

    now = int(time.time())
    jumps = [
        (12.9352, 77.6245, "Bangalore (start)"),
        (19.0760, 72.8777, "Mumbai  — 30s later — 830km jump!"),
        (28.6139, 77.2090, "Delhi   — 30s later — 1160km jump!"),
    ]

    for i, (lat, lng, place) in enumerate(jumps):
        send_event(
            {
                "user_id":      "u999",
                "device_id":    f"dSUS{i}",
                "upi_id":       "upiSUSPECT",
                "lat":          lat,
                "lng":          lng,
                "timestamp":    now + (i * 30),
                "claim_amount": 1000 if i > 0 else 0,
                "event_type":   "ZONE_HALTED" if i > 0 else "GPS_PING",
            },
            f"Teleport {i+1}: {place}",
        )
        time.sleep(0.1)

    ok("Teleportation fraction complete — check gps_speed values above ⬆")


# ── Scenario 3: Ghost Rider ───────────────────────────────────────────────────

def scenario_ghost_rider() -> None:
    section("Scenario 3 — Ghost Rider (brand-new unknown user)")
    info("First time this user_id + device_id has been seen — all defaults expected")

    result = send_event(
        {
            "user_id":      f"u_ghost_{int(time.time())}",
            "device_id":    f"d_ghost_{int(time.time())}",
            "upi_id":       "upi_ghost_new",
            "lat":          12.9352,
            "lng":          77.6245,
            "timestamp":    int(time.time()),
            "claim_amount": 500,
            "event_type":   "CLAIM_SUBMITTED",
        },
        "Ghost Rider — first event",
    )

    if result:
        # The service records the incoming event BEFORE computing features (by design),
        # so the very first call from a brand-new user will have:
        #   account_age_days = 0  (just created)
        #   gps_speed        = 0  (only 1 GPS point — no previous point to compare)
        #   claims_last_30d  = 1  (the current request's claim was just recorded)
        assert result["identity"]["account_age_days"] == 0, "Expected 0-day account"
        assert result["location"]["gps_speed"] == 0.0, "Expected 0 speed (no prior ping)"
        assert result["behavior"]["claims_last_30d"] <= 1, (
            f"Expected at most 1 claim (the current one), got {result['behavior']['claims_last_30d']}"
        )
        ok("All ghost-rider safe-defaults verified correctly")



# ── Scenario 4: Velocity Fraud ────────────────────────────────────────────────

def scenario_velocity_fraud() -> None:
    section("Scenario 4 — Velocity Fraud (physically impossible speed)")
    info("Normal Bangalore start, then instant jump to Chennai (350km in 10 seconds)")

    now  = int(time.time())
    uid  = "u_velocity_test"

    send_event(
        {
            "user_id":      uid,
            "device_id":    "d_velocity",
            "upi_id":       "upi_vel",
            "lat":          12.9352,
            "lng":          77.6245,
            "timestamp":    now,
            "claim_amount": 0,
            "event_type":   "GPS_PING",
        },
        "Ping 1: Bangalore (normal)",
    )
    time.sleep(0.2)

    result = send_event(
        {
            "user_id":      uid,
            "device_id":    "d_velocity",
            "upi_id":       "upi_vel",
            "lat":          13.0827,
            "lng":          80.2707,
            "timestamp":    now + 10,   # only 10 seconds later!
            "claim_amount": 950,
            "event_type":   "ZONE_HALTED",
        },
        "Ping 2: Chennai — 10s later (impossible speed!)",
    )

    if result:
        speed: float = float(result["location"]["gps_speed"])
        assert speed <= MAX_PLAUSIBLE_SPEED_KMH, (
            f"GPS speed {speed} exceeded cap of {MAX_PLAUSIBLE_SPEED_KMH} km/h!"
        )
        ok(f"Speed correctly capped at {speed} km/h (cap={MAX_PLAUSIBLE_SPEED_KMH})")


# ── Scenario 5: Device Sharing ────────────────────────────────────────────────

def scenario_device_sharing() -> None:
    section("Scenario 5 — Device Sharing (3 users, 1 device)")
    info("Simulating SIM-swap / shared-phone fraud: multiple users on same device")

    shared_device = "d_SHARED_PHONE"
    now           = int(time.time())

    for uid, upi, lat, lng in [
        ("u_share_A", "upi_A", 12.9352, 77.6245),
        ("u_share_B", "upi_B", 12.9300, 77.6100),
        ("u_share_C", "upi_C", 12.9500, 77.6400),
    ]:
        send_event(
            {
                "user_id":      uid,
                "device_id":    shared_device,
                "upi_id":       upi,
                "lat":          lat,
                "lng":          lng,
                "timestamp":    now,
                "claim_amount": 500,
                "event_type":   "CLAIM_SUBMITTED",
            },
            f"User {uid} on shared device",
        )
        time.sleep(0.1)

    info("\n  → device_id_uniqueness: formula = 1/(n_users+1) → expect ~0.25 after 3 users")
    ok("Device-sharing scenario complete — check uniqueness scores above ⬆")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\n{C.BOLD}{C.CYAN}")
    print("  ╔══════════════════════════════════════════════════════════════╗")
    print("  ║      AEGIS FRAUD FEATURE SERVICE — REAL-TIME TEST SUITE     ║")
    print(f"  ║         Target: {BASE_URL:<46}║")
    print("  ╚══════════════════════════════════════════════════════════════╝")
    print(C.RESET)

    # Health check
    try:
        code, body = _get(f"{BASE_URL}/health")
        if code == 200:
            ok(f"Service healthy: {body}")
        else:
            err(f"Health check failed: HTTP {code}")
            sys.exit(1)
    except ConnectionError:
        err(f"Cannot reach {BASE_URL}")
        err("Start: uvicorn main:app --host 0.0.0.0 --port 8002 --reload")
        sys.exit(1)

    t_start: float = time.time()

    scenario_normal_rider()
    scenario_suspicious_teleport()
    scenario_ghost_rider()
    scenario_velocity_fraud()
    scenario_device_sharing()

    elapsed: float = round(float(time.time() - t_start), 2)

    print(f"\n{C.BOLD}{C.GREEN}{'═'*65}")
    print(f"  All 5 scenarios completed in {elapsed}s")
    print(f"  → Review the scores above to identify fraud signals")
    print(f"{'═'*65}{C.RESET}\n")


if __name__ == "__main__":
    main()
