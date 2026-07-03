import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Codegen spec for the New Architecture (TurboModules).
 *
 * react-native-codegen reads this file at build time to generate the
 * native interface glue (Java/Kotlin + Objective-C++ host objects) for
 * both platforms. It intentionally mirrors NativePincodeLocationModule
 * in src/location/types.ts, but must use only codegen-supported types
 * (plain objects instead of mapped/utility types, no `Omit<...>`, etc).
 *
 * Under the Old Architecture, this file is unused — nativeBridge.ts falls
 * back to `NativeModules.PincodeIndia` directly, which the Kotlin/Swift
 * modules also satisfy via their @ReactMethod / RCT_EXTERN_METHOD exports.
 */
export interface LocationOptionsSpec {
  timeout?: number;
  accuracy?: string;
  maximumAge?: number;
}

export interface WatchLocationOptionsSpec extends LocationOptionsSpec {
  distanceFilter?: number;
  interval?: number;
}

export interface LocationCoordinatesSpec {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface ReverseGeocodeResultSpec {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface Spec extends TurboModule {
  requestLocationPermission(): Promise<boolean>;
  isLocationEnabled(): Promise<boolean>;
  getCurrentLocation(options: LocationOptionsSpec): Promise<LocationCoordinatesSpec>;
  reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeResultSpec>;
  startWatching(options: WatchLocationOptionsSpec): Promise<number>;
  stopWatching(watchId: number): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('PincodeIndia');
