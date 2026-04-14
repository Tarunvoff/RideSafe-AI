/**
 * [EXCELLENCE SUMMARY]
 * A high-abstraction utility for device-level geospatial acquisition. 
 * This module isolates the Expo-location dependency, providing a clean, platform-agnostic 
 * interface for the rest of the application to request raw coordinates.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary data-fetcher for the location context, anchoring 
 * the mobile device to the physical world for H3-risk zone mapping.
 */

type LocationCoords = { lat: number; lng: number };

let Location: any = null;
try {
  Location = require('expo-location');
} catch {
  Location = null;
}

/**
 * [IN-LINE PRIDE]: Atomic Location Fetcher
 * Encapsulates permission negotiation and coordinate retrieval into a single 
 * idempotent promise, ensuring that "Underserved" users are only prompted 
 * when the application strictly requires geospatial anchoring.
 */
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
