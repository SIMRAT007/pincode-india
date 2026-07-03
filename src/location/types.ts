import type { PincodeResult } from '../index';

/** Raw GPS fix as returned by the native FusedLocationProviderClient / CLLocationManager. */
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in meters. */
  accuracy: number;
  /** Altitude in meters, if available. */
  altitude?: number;
  /** Speed in meters/second, if available. */
  speed?: number;
  /** Heading in degrees from true north, if available. */
  heading?: number;
  /** Unix timestamp (ms) when the fix was captured. */
  timestamp: number;
}

/** Result of reverse-geocoding the device's current coordinates. */
export interface CurrentPincodeResult {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  /**
   * Present only when the resolved pincode also exists in the bundled
   * offline database. Contains the full offline record (post offices,
   * delivery status, circle/region, etc.) merged in for convenience.
   */
  offlineMatch?: PincodeResult;
}

/** Options accepted by getCurrentLocation() and watchLocation(). */
export interface LocationOptions {
  /** Max time (ms) to wait for a fix before rejecting with TimeoutError. Default 15000. */
  timeout?: number;
  /** Desired accuracy. 'high' uses GPS, 'balanced' may use network/wifi. Default 'high'. */
  accuracy?: 'high' | 'balanced' | 'low';
  /** Maximum age (ms) of a cached location that's acceptable to return. Default 0 (force fresh). */
  maximumAge?: number;
}

/** Options accepted by watchLocation(). */
export interface WatchLocationOptions extends LocationOptions {
  /** Minimum distance (meters) the device must move before a new update fires. Default 10. */
  distanceFilter?: number;
  /** Minimum time (ms) between updates. Default 5000. */
  interval?: number;
}

/** Numeric handle returned by watchLocation(), passed to stopWatchingLocation(). */
export type LocationWatchId = number;

/** Callback signature for watchLocation() updates. */
export type LocationUpdateCallback = (location: LocationCoordinates) => void;

/** Callback signature for watchLocation() errors. */
export type LocationErrorCallback = (error: Error) => void;

/**
 * Minimal native module surface that both the Android (TurboModule/legacy)
 * and iOS bridges must implement. The JS layer talks to this interface only;
 * it never reaches into NativeModules directly outside locationBridge.ts.
 */
export interface NativePincodeLocationModule {
  requestLocationPermission(): Promise<boolean>;
  isLocationEnabled(): Promise<boolean>;
  getCurrentLocation(options: LocationOptions): Promise<LocationCoordinates>;
  reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Omit<CurrentPincodeResult, 'offlineMatch'>>;
  startWatching(options: WatchLocationOptions): Promise<LocationWatchId>;
  stopWatching(watchId: LocationWatchId): Promise<void>;
}
