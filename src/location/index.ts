import { lookup as offlineLookup } from '../index';
import { detectRuntime } from './platform';
import { getNativeModule, requireNativeModule } from './nativeBridge';
import {
  getBrowserLocation,
  watchBrowserLocation,
  clearBrowserWatch,
} from './browserAdapter';
import {
  UnsupportedPlatformError,
  LocationUnavailableError,
  TimeoutError,
} from '../errors';
import type {
  LocationCoordinates,
  CurrentPincodeResult,
  LocationOptions,
  WatchLocationOptions,
  LocationWatchId,
  LocationUpdateCallback,
  LocationErrorCallback,
} from './types';

// ─── Internal watch registry ──────────────────────────────────────────────
// Maps the public watch id we hand back to callers -> the underlying
// platform-specific handle needed to actually stop watching.
type WatchEntry =
  | { kind: 'browser'; nativeWatchId: number }
  | { kind: 'react-native'; nativeWatchId: number };

const _activeWatches = new Map<LocationWatchId, WatchEntry>();
let _nextWatchId = 1;

/**
 * Wraps a promise with a timeout, rejecting with TimeoutError if it doesn't
 * settle in time. Used as a safety net around native module calls in case
 * a platform implementation never resolves/rejects.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError());
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── requestLocationPermission() ──────────────────────────────────────────

/**
 * Requests runtime location permission from the user.
 *
 * - React Native: delegates to the native module, which on Android requests
 *   ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION at runtime, and on iOS
 *   triggers the CLLocationManager authorization prompt.
 * - Browser: there is no separate "request permission" step — the browser
 *   prompts automatically on first `getCurrentPosition` call — so this
 *   resolves `true` immediately and the real prompt happens on first use.
 * - Node.js: rejects with UnsupportedPlatformError.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const runtime = detectRuntime();

  if (runtime === 'node') {
    throw new UnsupportedPlatformError();
  }

  if (runtime === 'browser') {
    return true;
  }

  if (runtime === 'react-native') {
    const native = requireNativeModule();
    return native.requestLocationPermission();
  }

  // 'unknown' runtime — fail closed, but don't claim Node specifically.
  throw new LocationUnavailableError(
    'Location permission could not be requested on this runtime.'
  );
}

// ─── isLocationEnabled() ───────────────────────────────────────────────────

/**
 * Checks whether device location services (GPS/network location) are
 * currently switched on. This is distinct from permission — a user can
 * grant permission while GPS itself is off.
 */
export async function isLocationEnabled(): Promise<boolean> {
  const runtime = detectRuntime();

  if (runtime === 'node') {
    throw new UnsupportedPlatformError();
  }

  if (runtime === 'browser') {
    // Browsers don't expose a direct "is GPS on" flag; presence of the API
    // is the closest equivalent signal we can give without prompting.
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  if (runtime === 'react-native') {
    const native = requireNativeModule();
    return native.isLocationEnabled();
  }

  return false;
}

// ─── getCurrentLocation() ──────────────────────────────────────────────────

/**
 * Gets a single current-location fix.
 *
 * - React Native: FusedLocationProviderClient (Android) / CLLocationManager (iOS).
 * - Browser: navigator.geolocation.getCurrentPosition.
 * - Node.js: rejects with UnsupportedPlatformError.
 */
export async function getCurrentLocation(
  options: LocationOptions = {}
): Promise<LocationCoordinates> {
  const runtime = detectRuntime();
  const timeout = options.timeout ?? 15000;

  if (runtime === 'node') {
    throw new UnsupportedPlatformError();
  }

  if (runtime === 'browser') {
    return withTimeout(getBrowserLocation(options), timeout);
  }

  if (runtime === 'react-native') {
    const native = requireNativeModule();
    return withTimeout(native.getCurrentLocation(options), timeout);
  }

  throw new LocationUnavailableError(
    'getCurrentLocation() is not supported on this runtime.'
  );
}

// ─── getCurrentPincode() ───────────────────────────────────────────────────

/**
 * Gets the device's current pincode via native reverse-geocoding
 * (Android Geocoder / iOS CLGeocoder — no paid mapping APIs).
 *
 * If the resolved pincode also exists in the bundled offline database,
 * the result is enriched with `offlineMatch`, which carries post offices,
 * delivery status, circle/region and the offline DB's coordinates.
 *
 * Not supported in the browser (no built-in reverse geocoder) or Node.js.
 */
export async function getCurrentPincode(
  options: LocationOptions = {}
): Promise<CurrentPincodeResult> {
  const runtime = detectRuntime();

  if (runtime === 'node') {
    throw new UnsupportedPlatformError();
  }

  if (runtime === 'browser') {
    throw new LocationUnavailableError(
      'getCurrentPincode() requires native reverse-geocoding and is not ' +
        'available in the browser. Use getCurrentLocation() for coordinates, ' +
        'or pair it with your own geocoding service.'
    );
  }

  if (runtime !== 'react-native') {
    throw new LocationUnavailableError(
      'getCurrentPincode() is not supported on this runtime.'
    );
  }

  const native = requireNativeModule();
  const timeout = options.timeout ?? 15000;

  const coords = await withTimeout(native.getCurrentLocation(options), timeout);
  const geocoded = await withTimeout(
    native.reverseGeocode(coords.latitude, coords.longitude),
    timeout
  );

  const result: CurrentPincodeResult = { ...geocoded };

  if (result.pincode) {
    const offline = offlineLookup(result.pincode);
    if (offline) {
      result.offlineMatch = offline;
      // Prefer offline DB's district/state casing/values when present —
      // they're curated from India Post data and more consistent than
      // freeform geocoder output.
      result.district = offline.district || result.district;
      result.state = offline.state || result.state;
    }
  }

  return result;
}

// ─── watchLocation() / stopWatchingLocation() ──────────────────────────────

/**
 * Starts continuous location updates.
 *
 * Returns a numeric watch id to pass to `stopWatchingLocation()`.
 * On Node.js this throws synchronously rather than returning a id,
 * since there is nothing to watch.
 */
export function watchLocation(
  onUpdate: LocationUpdateCallback,
  onError?: LocationErrorCallback,
  options: WatchLocationOptions = {}
): LocationWatchId {
  const runtime = detectRuntime();
  const handleError = onError ?? (() => {});

  if (runtime === 'node') {
    throw new UnsupportedPlatformError();
  }

  const publicWatchId = _nextWatchId++;

  if (runtime === 'browser') {
    const nativeWatchId = watchBrowserLocation(onUpdate, handleError, options);
    _activeWatches.set(publicWatchId, { kind: 'browser', nativeWatchId });
    return publicWatchId;
  }

  if (runtime === 'react-native') {
    const native = requireNativeModule();
    native
      .startWatching(options)
      .then((nativeWatchId) => {
        _activeWatches.set(publicWatchId, {
          kind: 'react-native',
          nativeWatchId,
        });
      })
      .catch(handleError);

    // Register a provisional entry immediately so stopWatchingLocation()
    // called synchronously right after watchLocation() doesn't no-op.
    if (!_activeWatches.has(publicWatchId)) {
      _activeWatches.set(publicWatchId, { kind: 'react-native', nativeWatchId: -1 });
    }
    return publicWatchId;
  }

  handleError(
    new LocationUnavailableError('watchLocation() is not supported on this runtime.')
  );
  return publicWatchId;
}

/**
 * Stops a previously started location watch.
 * Safe to call multiple times or with an unknown id (no-op).
 */
export async function stopWatchingLocation(
  watchId: LocationWatchId
): Promise<void> {
  const entry = _activeWatches.get(watchId);
  if (!entry) return;

  if (entry.kind === 'browser') {
    clearBrowserWatch(entry.nativeWatchId);
  } else {
    const native = getNativeModule();
    if (native && entry.nativeWatchId >= 0) {
      await native.stopWatching(entry.nativeWatchId);
    }
  }

  _activeWatches.delete(watchId);
}

/** Test-only helper to reset all in-memory watch state. */
export function __resetWatchState(): void {
  _activeWatches.clear();
  _nextWatchId = 1;
}
