import * as Location from 'expo-location';

export type LocationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type Coordinates = { latitude: number; longitude: number };

// In-memory cache only — never persisted, never sent anywhere. Avoids
// re-hitting the GPS on every screen focus within the same app session.
let cachedLocation: { coords: Coordinates; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Current permission state without prompting. Use this to decide whether a
 * "near me" affordance should read as on/off before the user interacts.
 */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED && !canAskAgain) return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/**
 * Requests foreground location permission — only call this from a direct
 * user action (tapping "Near me", opening a distance-aware screen), never on
 * app boot. Only actually prompts when the OS hasn't been asked before or
 * previously granted; if the user already said no, this returns 'denied'
 * without re-prompting (respect their choice — send them to Settings instead).
 */
export async function requestLocationPermission(): Promise<LocationPermissionState> {
  const current = await getLocationPermissionState();
  if (current !== 'undetermined') return current;

  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * One-shot current position. Returns null if permission isn't granted or the
 * device can't produce a fix — callers should treat that as "no distance
 * data available" rather than an error. Never starts continuous tracking.
 */
export async function getCurrentLocation(options?: { forceRefresh?: boolean }): Promise<Coordinates | null> {
  if (!options?.forceRefresh && cachedLocation && Date.now() - cachedLocation.fetchedAt < CACHE_TTL_MS) {
    return cachedLocation.coords;
  }

  const state = await getLocationPermissionState();
  if (state !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    cachedLocation = { coords, fetchedAt: Date.now() };
    return coords;
  } catch {
    return null;
  }
}

/** Requests permission if needed, then returns a location in one call. */
export async function requestAndGetLocation(): Promise<Coordinates | null> {
  const state = await requestLocationPermission();
  if (state !== 'granted') return null;
  return getCurrentLocation();
}

export default {
  getLocationPermissionState,
  requestLocationPermission,
  getCurrentLocation,
  requestAndGetLocation,
};
