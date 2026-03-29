# Aegis Stream 2 — H3 Mapper

import h3


def geo_to_h3(lat, lng, resolution=8):
    """Convert latitude/longitude to an H3 cell id."""
    return h3.latlng_to_cell(lat, lng, resolution)
