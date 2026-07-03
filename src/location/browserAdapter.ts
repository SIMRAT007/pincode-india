import type { LocationCoordinates, LocationOptions } from './types';
import {
  LocationUnavailableError,
  PermissionDeniedError,
  TimeoutError,
} from '../errors';

/** True when `navigator.geolocation` exists in this environment. */
export function hasBrowserGeolocation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.geolocation !== 'undefined' &&
    typeof navigator.geolocation.getCurrentPosition === 'function'
  );
}

function mapGeolocationPositionError(err: GeolocationPositionError): Error {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new PermissionDeniedError();
    case err.TIMEOUT:
      return new TimeoutError();
    case err.POSITION_UNAVAILABLE:
    default:
      return new LocationUnavailableError(err.message || undefined);
  }
}

/**
 * Gets a single coordinate fix via `navigator.geolocation`.
 * Browser builds intentionally do NOT perform reverse geocoding
 * (no Google/HERE/Mappls calls) — callers get coordinates only.
 */
export function getBrowserLocation(
  options: LocationOptions = {}
): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!hasBrowserGeolocation()) {
      reject(
        new LocationUnavailableError(
          'navigator.geolocation is not available in this browser.'
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? undefined,
          speed: position.coords.speed ?? undefined,
          heading: position.coords.heading ?? undefined,
          timestamp: position.timestamp,
        });
      },
      (err) => reject(mapGeolocationPositionError(err)),
      {
        enableHighAccuracy: options.accuracy !== 'low',
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 0,
      }
    );
  });
}

/**
 * Starts a continuous browser watch via `navigator.geolocation.watchPosition`.
 * Returns the numeric watch id used by `navigator.geolocation.clearWatch`.
 */
export function watchBrowserLocation(
  onUpdate: (location: LocationCoordinates) => void,
  onError: (error: Error) => void,
  options: LocationOptions = {}
): number {
  if (!hasBrowserGeolocation()) {
    onError(
      new LocationUnavailableError(
        'navigator.geolocation is not available in this browser.'
      )
    );
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        speed: position.coords.speed ?? undefined,
        heading: position.coords.heading ?? undefined,
        timestamp: position.timestamp,
      });
    },
    (err) => onError(mapGeolocationPositionError(err)),
    {
      enableHighAccuracy: options.accuracy !== 'low',
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 0,
    }
  );
}

export function clearBrowserWatch(watchId: number): void {
  if (hasBrowserGeolocation() && watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}
