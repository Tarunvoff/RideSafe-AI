import React, { createContext, useCallback, useContext, useState } from 'react';

export type LocationState = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isMock: boolean;
  fetchedAt: Date | null;
  loading: boolean;
  error: string | null;
};

type LocationContextType = {
  location: LocationState;
  refreshLocation: () => Promise<void>;
};

const MOCK_LOCATION = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 0,
  isMock: true,
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
    ...MOCK_LOCATION,
    fetchedAt: null,
    loading: true,
    error: null,
  });

  const setMock = useCallback((reason: string) => {
    setLocation({
      ...MOCK_LOCATION,
      fetchedAt: new Date(),
      loading: false,
      error: reason,
    });
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    if (!ExpoLocation) {
      setMock('expo-location not available');
      return;
    }

    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMock('Location permission denied');
        return;
      }

      const timeoutMs = 10_000;
      const locationPromise = ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location timeout')), timeoutMs),
      );

      const result: any = await Promise.race([locationPromise, timeoutPromise]);
      const coords = result?.coords;
      if (!coords) {
        setMock('Location unavailable');
        return;
      }

      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        isMock: false,
        fetchedAt: new Date(),
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setMock(err?.message ?? 'Location fetch failed');
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
