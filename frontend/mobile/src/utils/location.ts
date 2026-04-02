type LocationCoords = { lat: number; lng: number };

let Location: any = null;
try {
  Location = require('expo-location');
} catch {
  Location = null;
}

export async function getDeviceLocation(): Promise<LocationCoords | null> {
  if (!Location) return null;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}
