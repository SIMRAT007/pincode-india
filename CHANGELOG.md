# Changelog

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-06-30

### Added

- **Native current-location support** for React Native (Android + iOS):
  - `requestLocationPermission()` — requests runtime location permission
  - `isLocationEnabled()` — checks whether device GPS/network location is on
  - `getCurrentLocation()` — single-shot GPS fix (lat/lng/accuracy/altitude/speed/heading)
  - `getCurrentPincode()` — native reverse-geocodes the current location and merges the
    result with the bundled offline database (post offices, delivery status, circle/region)
  - `watchLocation()` / `stopWatchingLocation()` — continuous location updates
- **Android**: native Kotlin module using `FusedLocationProviderClient`
  (Google Play Services) for location and `android.location.Geocoder` for
  reverse geocoding. No third-party RN location libraries, no paid mapping APIs.
- **iOS**: native Swift module using `CLLocationManager` and `CLGeocoder`.
  Same no-third-party, no-paid-API guarantee as Android.
- **Browser**: `getCurrentLocation()` falls back to `navigator.geolocation`
  (coordinates only — browsers have no built-in reverse geocoder, so
  `getCurrentPincode()` is not available in the browser by design).
- **Node.js**: all location APIs reject with `UnsupportedPlatformError`
  (message: `"Location APIs are not supported in Node.js"`). Offline
  lookup APIs (`lookup`, `searchByCity`, etc.) are unaffected.
- New error classes: `PermissionDeniedError`, `LocationDisabledError`,
  `LocationUnavailableError`, `GeocoderError`, `TimeoutError`,
  `UnsupportedPlatformError` — all extend a common
  `PincodeIndiaLocationError` base class with a stable `.code` field.
- New Architecture (TurboModule) support via `src/NativePincodeIndia.ts`
  codegen spec, with automatic fallback to the legacy bridge
  (`NativeModules.PincodeIndia`) when TurboModules aren't enabled.
- Full TypeScript types for every new API — no `any` in the public surface.
- Example React Native app under `example/` demonstrating every new API.
- 106 automated tests (up from 44), covering platform detection, the
  native bridge resolution logic, the browser geolocation adapter, the
  offline/online merge logic in `getCurrentPincode()`, error mapping,
  and Node.js rejection behavior.

### Changed

- Package description and keywords updated to reflect the new location
  capabilities.
- `peerDependencies` now lists `react-native >=0.71.0` as an **optional**
  peer dependency — Node.js and browser consumers do not need it installed.

### Not Changed (backward compatibility)

- Every v1.x export (`lookup`, `lookupMany`, `isValid`, `isDeliverable`,
  `getState`, `getDistrict`, `getCity`, `getCoordinates`, `getPostOffices`,
  `getByState`, `getByDistrict`, `searchByCity`, `getAllStates`,
  `getDistricts`, `preload`, `clearCache`) keeps its exact signature,
  return type, and behavior. All 44 original v1.0.0 tests pass unmodified.
- The offline pincode database and its on-disk format are unchanged.
- Lookup performance remains sub-millisecond (~0.0004ms per call once
  the data is loaded — see README "Performance" section).

### Migration from v1.x

No code changes are required if you only use the offline lookup APIs —
`pincode-india@2.0.0` is a drop-in replacement for `1.x` in that respect.

If you want the new location features in a React Native app:

```bash
npm install pincode-india@^2.0.0
cd ios && pod install   # iOS only — autolinking handles Android
```

Add the required permission strings:

- **Android** — already declared by the library's manifest
  (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`); no action needed
  unless you want to customize them.
- **iOS** — add `NSLocationWhenInUseUsageDescription` (and optionally
  `NSLocationAlwaysAndWhenInUseUsageDescription`) to your app's
  `Info.plist`. See `ios/Info.plist.example`.

Then:

```ts
import { requestLocationPermission, getCurrentPincode } from 'pincode-india';

const granted = await requestLocationPermission();
if (granted) {
  const result = await getCurrentPincode();
  console.log(result.pincode, result.city, result.state);
}
```

---

## [1.0.0] — 2026-06-29

### Added

- Initial release.
- Offline lookup for 19,500+ Indian pincodes (165,000+ post offices)
  sourced from India Post data.
- `lookup`, `lookupMany`, `isValid`, `isDeliverable`, `getState`,
  `getDistrict`, `getCity`, `getCoordinates`, `getPostOffices`,
  `getByState`, `getByDistrict`, `searchByCity`, `getAllStates`,
  `getDistricts`, `preload`, `clearCache`.
- TypeScript-first, zero runtime dependencies, dual CJS/ESM build.
- 44 automated tests.
