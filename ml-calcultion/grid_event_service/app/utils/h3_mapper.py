try:
    import h3
    _H3_AVAILABLE = True
except ImportError:
    _H3_AVAILABLE = False

def geo_to_h3(latitude: float, longitude: float, resolution: int = 8) -> str:
    """
    Convert latitude and longitude to H3 grid ID.
    Resolution 8 provides city-level granularity.
    Falls back to a stable lat/lon string if h3 is not installed.
    """
    if _H3_AVAILABLE:
        try:
            # h3 v3 API
            return h3.geo_to_h3(latitude, longitude, resolution)
        except AttributeError:
            # h3 v4 API
            return h3.latlng_to_cell(latitude, longitude, resolution)
    # Fallback: deterministic string grid ID
    return f"grid_{round(latitude, 3)}_{round(longitude, 3)}"
