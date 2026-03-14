import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * useGpsMockDetection Hook
 * Performs GPS mock location detection with mocked data for MVP
 * Real implementation would use:
 * - expo-location for actual GPS
 * - Native modules for mock detection
 */
export function useGpsMockDetection() {
  const [detectionResult, setDetectionResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const checkCount = useRef(0);

  /**
   * Generate mocked but realistic GPS detection data
   * For MVP showcase, we simulate various scenarios
   */
  const generateMockedDetectionResult = () => {
    checkCount.current += 1;

    // Simulate different scenarios on each check (for demo purposes)
    const scenario = checkCount.current % 4; // Cycle through scenarios

    let result;

    switch (scenario) {
      case 1:
        // Scenario: Mock GPS detected
        result = {
          isMocked: true,
          fraudScore: 85,
          confidence: 'HIGH',
          timestamp: new Date().toISOString(),
          signals: [
            { type: 'mock_flag', detected: true, severity: 'critical', message: 'Mock location flag detected' },
            { type: 'accuracy_anomaly', detected: true, severity: 'high', message: 'GPS accuracy: 0m (impossible)' },
            { type: 'dev_mode', detected: true, severity: 'high', message: 'Developer mode mock locations enabled' },
          ],
          location: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 0,
            provider: 'mock',
          },
          recommendation: 'REJECT',
          reasonText: 'Multiple mock location indicators detected. Device is likely spoofing GPS.',
        };
        break;

      case 2:
        // Scenario: Suspicious but not definitive
        result = {
          isMocked: false,
          fraudScore: 45,
          confidence: 'MEDIUM',
          timestamp: new Date().toISOString(),
          signals: [
            { type: 'accuracy_poor', detected: true, severity: 'medium', message: 'GPS accuracy degraded: 150m' },
            { type: 'speed_anomaly', detected: true, severity: 'medium', message: 'Sudden speed jump: 200 km/h' },
          ],
          location: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 150,
            provider: 'gps',
          },
          recommendation: 'MANUAL_REVIEW',
          reasonText: 'Some anomalies detected. Human review recommended.',
        };
        break;

      case 3:
        // Scenario: Clean - legitimate rider
        result = {
          isMocked: false,
          fraudScore: 12,
          confidence: 'HIGH',
          timestamp: new Date().toISOString(),
          signals: [
            { type: 'accurate_reading', detected: false, severity: 'low', message: 'GPS accuracy: 8m (normal)' },
            { type: 'realistic_speed', detected: false, severity: 'low', message: 'Speed: 45 km/h (realistic)' },
            { type: 'continuous_signal', detected: false, severity: 'low', message: 'Consistent GPS signal' },
          ],
          location: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 8,
            provider: 'gps',
          },
          recommendation: 'APPROVE',
          reasonText: 'All GPS signals look legitimate. Rider verification passed.',
        };
        break;

      default:
        // Scenario: Rooted device trying to hide spoofing
        result = {
          isMocked: false,
          fraudScore: 72,
          confidence: 'HIGH',
          timestamp: new Date().toISOString(),
          signals: [
            { type: 'rooted_device', detected: true, severity: 'critical', message: 'Device appears rooted/jailbroken' },
            { type: 'mock_providers', detected: true, severity: 'critical', message: '2 mock location providers found' },
            { type: 'impossible_jump', detected: true, severity: 'high', message: '50km jump in 5 seconds' },
          ],
          location: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 5,
            provider: 'fused',
          },
          recommendation: 'REJECT',
          reasonText: 'Device security compromised. GPS spoofing likely masked.',
        };
    }

    return result;
  };

  /**
   * Perform GPS mock detection
   * Real implementation would:
   * - Request location permissions
   * - Get actual GPS location
   * - Check for mock flags
   * - Validate against historical data
   */
  const performDetection = async () => {
    setIsChecking(true);
    setError(null);

    try {
      // Simulate network delay (real GPS API call would happen here)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // In real version:
      // const location = await Location.getCurrentPositionAsync();
      // const isMocked = location.mocked || checkForMockProviders();

      const result = generateMockedDetectionResult();
      setDetectionResult(result);
    } catch (err) {
      setError(err.message || 'Failed to check GPS authenticity');
      setDetectionResult(null);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Continuous background monitoring
   * Real implementation would run this periodically during a trip
   */
  useEffect(() => {
    // Uncomment for real-time monitoring
    // const interval = setInterval(performDetection, 5000);
    // return () => clearInterval(interval);

    // For MVP, just run once on mount
    performDetection();
  }, []);

  return {
    detectionResult,
    isChecking,
    error,
    performDetection,
    isMocked: detectionResult?.isMocked,
    fraudScore: detectionResult?.fraudScore,
  };
}
