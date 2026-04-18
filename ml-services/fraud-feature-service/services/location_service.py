"""
services/location_service.py — Location feature computation.

Computes:
  • gps_speed           — km/h from last two GPS pings (0 if < 2 pings)
  • gps_cell_distance   — great-circle km between current and previous H3 centre
  • h3_zone_consistency — fraction of last-24h pings in the current H3 cell
  • has_history_in_zone — true if user has pings strictly before current one in this H3
  • h3_burst_detected   — true if ring detection threshold breached in this H3

Edge-case guarantees:
  • GPS history empty or single point → gps_speed = 0, gps_cell_distance = 0
  • No last-24h pings → h3_zone_consistency = 1.0 (safe default, no anomaly)
"""

from __future__ import annotations

import logging

from config import (
    H3_RESOLUTION,
    DEFAULT_GPS_SPEED,
    DEFAULT_GPS_CELL_DISTANCE,
    DEFAULT_H3_ZONE_CONSISTENCY,
    GPS_CONSISTENCY_WINDOW_HOURS,
    MAX_PLAUSIBLE_SPEED_KMH,
)
from utils.geo import latlng_to_h3, h3_cell_center, haversine_km
from utils.time_utils import seconds_between, filter_within_hours
from models.schemas import LocationFeatures

logger = logging.getLogger(__name__)


def compute_gps_speed(
    gps_history: list[dict],
    current_lat: float,
    current_lng: float,
    current_ts: int,
) -> float:
    """
    Estimate speed (km/h) using the previous stored GPS ping and the
    current request's coordinates.

    IMPORTANT: the service stores the current ping at the END of gps_history
    BEFORE calling this function (by design, for consistency). So:
      gps_history[-1] = the just-recorded current ping  ← skip it
      gps_history[-2] = the actual previous ping         ← use this

    Returns 0 if:
      - fewer than 2 historical pings exist (no prior point to compare)
      - time delta is 0 (avoid div-by-zero)
    """
    if len(gps_history) < 2:
        return DEFAULT_GPS_SPEED

    # Skip the last entry (current ping that was just appended)
    prev = gps_history[-2]
    prev_lat = prev.get("lat")
    prev_lng = prev.get("lng")
    prev_ts = prev.get("timestamp")

    if prev_lat is None or prev_lng is None or prev_ts is None:
        return DEFAULT_GPS_SPEED

    dt_sec = seconds_between(prev_ts, current_ts)
    if dt_sec <= 0:
        return DEFAULT_GPS_SPEED

    distance_km = haversine_km(prev_lat, prev_lng, current_lat, current_lng)
    speed_kmh = (distance_km / dt_sec) * 3600.0

    return round(speed_kmh, 2)


def compute_gps_cell_distance(
    gps_history: list[dict],
    current_lat: float,
    current_lng: float,
) -> float:
    """
    Distance (km) between the centroid of the current H3 cell and the
    centroid of the H3 cell from the previous GPS ping.

    IMPORTANT: gps_history[-1] = current ping (just appended) — skip it.
               gps_history[-2] = the actual previous ping.

    Zero if fewer than 2 pings exist, or both resolve to the same cell.
    """
    if len(gps_history) < 2:
        return DEFAULT_GPS_CELL_DISTANCE

    # Skip the last entry (current ping just appended)
    prev = gps_history[-2]
    prev_lat = prev.get("lat")
    prev_lng = prev.get("lng")
    if prev_lat is None or prev_lng is None:
        return DEFAULT_GPS_CELL_DISTANCE

    current_cell = latlng_to_h3(current_lat, current_lng, H3_RESOLUTION)
    prev_cell = latlng_to_h3(prev_lat, prev_lng, H3_RESOLUTION)

    if current_cell == prev_cell:
        return 0.0

    cur_clat, cur_clng = h3_cell_center(current_cell)
    prv_clat, prv_clng = h3_cell_center(prev_cell)

    return round(haversine_km(prv_clat, prv_clng, cur_clat, cur_clng), 4)


def compute_h3_zone_consistency(
    gps_history: list[dict],
    current_lat: float,
    current_lng: float,
    now_ts: int,
) -> float:
    """
    Fraction of GPS pings in the last GPS_CONSISTENCY_WINDOW_HOURS that fell
    within the same H3 cell as the current position.

    1.0 → always in same zone (normal)
    0.0 → never in same zone (suspicious)
    Returns 1.0 (safe) when no recent history exists.
    """
    recent = filter_within_hours(gps_history, now_ts, GPS_CONSISTENCY_WINDOW_HOURS)
    if not recent:
        return DEFAULT_H3_ZONE_CONSISTENCY

    current_cell = latlng_to_h3(current_lat, current_lng, H3_RESOLUTION)
    matching = sum(
        1
        for ping in recent
        if latlng_to_h3(
            ping.get("lat", 0.0),
            ping.get("lng", 0.0),
            H3_RESOLUTION,
        ) == current_cell
    )
    return round(matching / len(recent), 4)


def compute_has_history_in_zone(
    gps_history: list[dict],
    current_lat: float,
    current_lng: float,
    now_ts: int
) -> bool:
    """
    Rule: IF user has NO history in current H3 → HIGH fraud signal
    Returns True if any ping *before* the current one was in this H3 cell.
    """
    if len(gps_history) < 2:
        return False
        
    current_cell = latlng_to_h3(current_lat, current_lng, H3_RESOLUTION)
    
    # Check all history EXCEPT the final ping (which is the current one)
    for ping in gps_history[:-1]:
        cell = latlng_to_h3(ping.get("lat", 0.0), ping.get("lng", 0.0), H3_RESOLUTION)
        if cell == current_cell:
            return True
            
    return False


def compute_h3_burst_detected(zone_record: dict | None) -> bool:
    """
    Rule: IF multiple users appear in same H3 at same timestamp -> mark as fraud cluster
    """
    if not zone_record:
        return False
        
    # We rely on the burst tracking in the store. 
    # Store sets "burst_detected" flag based on concurrent pings.
    return zone_record.get("burst_detected", False)


def compute_location_features(
    user_record: dict | None,
    zone_record: dict | None,
    current_lat: float,
    current_lng: float,
    now_ts: int,
) -> LocationFeatures:
    """
    Orchestrate all location feature computations and return a LocationFeatures model.
    """
    gps_history: list[dict] = user_record.get("gps_history", []) if user_record else []

    gps_speed = compute_gps_speed(gps_history, current_lat, current_lng, now_ts)
    gps_cell_distance = compute_gps_cell_distance(gps_history, current_lat, current_lng)
    
    # [TASK 1]: Telemetry Spoof Detection (Relative Velocity Check)
    # Threshold based on audit recommendation (150 km/h is the upper limit for typical transit).
    # Any speed exceeding this suggests digital teleportation or sensor injection.
    telemetry_spoof_detected = gps_speed > MAX_PLAUSIBLE_SPEED_KMH

    h3_zone_consistency = compute_h3_zone_consistency(
        gps_history, current_lat, current_lng, now_ts
    )
    has_history_in_zone = compute_has_history_in_zone(
        gps_history, current_lat, current_lng, now_ts
    )
    h3_burst_detected = compute_h3_burst_detected(zone_record)

    logger.debug(
        "Location features: speed=%.2f km/h, spoof=%s, cell_dist=%.4f km, consistency=%.3f, history_in_zone=%s, burst=%s",
        gps_speed,
        telemetry_spoof_detected,
        gps_cell_distance,
        h3_zone_consistency,
        has_history_in_zone,
        h3_burst_detected
    )

    return LocationFeatures(
        gps_speed=gps_speed,
        gps_cell_distance=gps_cell_distance,
        h3_zone_consistency=h3_zone_consistency,
        has_history_in_zone=has_history_in_zone,
        h3_burst_detected=h3_burst_detected,
        telemetry_spoof_detected=telemetry_spoof_detected
    )
