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
    
    // Store error state WITHOUT fallback coordinates
    setLocation({
      latitude: null,
      longitude: null,
      accuracy: null,
      isMock: false,
      isValid: false,
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
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMock(
          'Location access denied. Please enable location permissions in settings to use the Live Risk map feature.'
        );
        return;
      }

      let coords = null;
      let accuracy = null;

      try {
        const lastKnown = await ExpoLocation.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          coords = lastKnown.coords;
        }
      } catch (e) {
        // Ignore last known errors, try to get current position
      }

      if (!coords) {
        const timeoutMs = 10_000;
        const locationPromise = ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), timeoutMs),
        );

        const result: any = await Promise.race([locationPromise, timeoutPromise]);
        coords = result?.coords;
      }

      if (!coords) {
        setMock(
          'Unable to determine your location. Please check your GPS signal and try again, or ensure location services are enabled.'
        );
        return;
      }

      // ✅ Location successfully acquired
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
      
      console.log('✅ Location acquired:', { lat: coords.latitude, lon: coords.longitude });
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Failed to fetch location';
      setMock(`Location error: ${errorMessage}. Please try again.`);
    }
  }, [setMock]);

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
