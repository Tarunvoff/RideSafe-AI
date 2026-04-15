"""
utils/geo.py

Geospatial helpers for H3 ↔ lat/lon conversion.
All functions are pure (no side effects).
"""

import h3
from config import H3_RESOLUTION


def h3_to_latlng(h3_cell: str) -> tuple[float, float]:
    """
    Convert an H3 cell ID to its centroid (lat, lng).
    Uses h3.cell_to_latlng — compatible with h3-py >= 4.x.
    """
    lat, lng = h3.cell_to_latlng(h3_cell)
    return float(lat), float(lng)


def latlng_to_h3(lat: float, lng: float, resolution: int = H3_RESOLUTION) -> str:
    """Convert lat/lng to an H3 cell ID."""
    return h3.latlng_to_cell(lat, lng, resolution)


def validate_h3_cell(h3_cell: str) -> bool:
    """Return True if the H3 cell ID is valid."""
    try:
        return h3.is_valid_cell(h3_cell)
    except Exception:
        return False
