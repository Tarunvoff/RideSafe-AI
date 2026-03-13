import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

# Mock data for testing
mock_zone_data = {
    "zone_id": 1,
    "temperature": 32.5,
    "rainfall": 45.0,
    "aqi": 150.0,
    "pm2_5": 60.0,
    "active_riders": 15,
    "platform_orders": 200,
    "disruption_probability": 0.85,
    "risk_level": "HIGH",
    "recommended_grid_state": "HALTED",
    "timestamp": "2023-10-27T10:00:00"
}

@patch('app.api.zone_routes.get_cached_zone_data')
def test_get_zone_intelligence_cached(mock_get_cache):
    # Simulate cache hit
    mock_get_cache.return_value = mock_zone_data
    
    response = client.get("/zone-intelligence/1")
    assert response.status_code == 200
    assert response.json() == mock_zone_data
    mock_get_cache.assert_called_once_with(1)

@patch('app.api.zone_routes.get_cached_zone_data')
@patch('app.api.zone_routes.calculate_zone_intelligence')
@patch('app.api.zone_routes.set_cached_zone_data')
def test_get_zone_intelligence_no_cache(mock_set_cache, mock_calc, mock_get_cache):
    # Simulate cache miss
    mock_get_cache.return_value = None
    mock_calc.return_value = mock_zone_data
    
    response = client.get("/zone-intelligence/1")
    assert response.status_code == 200
    assert response.json() == mock_zone_data
    
    # Check that cache was checked, calculation was done, and cache was set
    mock_get_cache.assert_called_once_with(1)
    mock_calc.assert_called_once()
    mock_set_cache.assert_called_once_with(1, mock_zone_data, expire=30)
