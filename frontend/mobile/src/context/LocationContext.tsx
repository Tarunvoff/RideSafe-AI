import React, { createContext, useCallback, useContext, useState } from 'react';
import { telemetryApi } from '../services/api';

export type LocationState = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isMock: boolean;
  isValid: boolean;
  fetchedAt: Date | null;
  loading: boolean;
  error: string | null;
};

type LocationContextType = {
  location: LocationState;
  refreshLocation: () => Promise<void>;
};


let ExpoLocation: any = null;
try {
  ExpoLocation = require('expo-location');
} catch {
  ExpoLocation = null;
}

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    isMock: false,
    isValid: false,
    fetchedAt: null,
    loading: true,
    error: null,
  });

  const setMock = useCallback((reason: string) => {
    // We log the error telemetry here to track how many users are missing location permissions/capabilities
    console.warn(`❌ Location fetch failed: ${reason}`);
    void telemetryApi.reportLocationFailure({ reason, platform: 'mobile-app' }).catch(() => {});
    
    // Store mock fallback coordinates (Bangalore, India)
    const MOCK_LAT = 12.9716;
    const MOCK_LNG = 77.5946;

    setLocation({
      latitude: MOCK_LAT,
      longitude: MOCK_LNG,
      accuracy: 65,
      isMock: true,
      isValid: true,
      fetchedAt: new Date(),
      loading: false,
      error: reason,
    });
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    if (!ExpoLocation) {
      setMock('Location service unavailable. Please ensure location permissions are enabled.');
      return;
    }

    try {
      const fetchTask = async () => {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return { error: 'Location access denied. Please enable location permissions in settings.' };
        }

        let coords = null;
        try {
          const lastKnown = await ExpoLocation.getLastKnownPositionAsync();
          if (lastKnown?.coords) {
            coords = lastKnown.coords;
          }
        } catch (e) {
          // Ignore last known errors
        }

        if (!coords) {
          const locationPromise = ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Location request timed out')), 8000),
          );
          const result: any = await Promise.race([locationPromise, timeoutPromise]);
          coords = result?.coords;
        }

        if (!coords) {
          return { error: 'Unable to determine your location.' };
        }

        if (Math.abs(coords.latitude) < 0.1 && Math.abs(coords.longitude) < 0.1) {
          return { error: 'Suspicious coordinates (0,0).' };
        }

        return { coords };
      };

      // Wrap the entire flow in a master timeout to prevent getting stuck infinitely on permission dialogs or OS hangs.
      const masterTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location service is not responding.')), 15000)
      );

      const result: any = await Promise.race([fetchTask(), masterTimeout]);

      if (result?.error) {
        setMock(`${result.error} Enabling mock data.`);
        return;
      }

      const coords = result.coords;
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        isMock: false,
        isValid: true,
        fetchedAt: new Date(),
        loading: false,
        error: null,
      });
      
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Failed to fetch location';
      setMock(`Location error: ${errorMessage}. Enabling mock data.`);
    }
  }, [setMock]);

  React.useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  return (
    <LocationContext.Provider value={{ location, refreshLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
