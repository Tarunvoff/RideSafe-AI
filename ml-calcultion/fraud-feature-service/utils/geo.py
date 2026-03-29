"""
utils/geo.py — Geospatial helpers for the fraud feature service.

Pure functions only — no side effects, no I/O.
"""

from __future__ import annotations

import math
import h3 as h3lib

from config import H3_RESOLUTION


def latlng_to_h3(lat: float, lng: float, resolution: int = H3_RESOLUTION) -> str:
    """Convert a GPS coordinate to an H3 cell ID at the configured resolution."""
    return h3lib.latlng_to_cell(lat, lng, resolution)


def h3_cell_center(cell: str) -> tuple[float, float]:
    """Return the (lat, lng) centroid of an H3 cell."""
    lat, lng = h3lib.cell_to_latlng(cell)
    return float(lat), float(lng)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Great-circle distance between two points in kilometres.
    Uses the Haversine formula — accurate within ~0.5% for short distances.
    """
    R = 6371.0  # Earth radius km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
