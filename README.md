# pincode-india

**Offline Indian pincode lookup + native current-location for React Native.**  
19,500+ pincodes · 36 states/UTs · Zero paid APIs · Zero third-party location libs · Full TypeScript

[![npm version](https://img.shields.io/npm/v/pincode-india.svg)](https://www.npmjs.com/package/pincode-india)
[![npm downloads](https://img.shields.io/npm/dm/pincode-india.svg)](https://www.npmjs.com/package/pincode-india)
[![CI](https://github.com/technoxys/pincode-india/actions/workflows/ci.yml/badge.svg)](https://github.com/technoxys/pincode-india/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-106%20passing-brightgreen.svg)](#)

---

## What is this?

`pincode-india` is an npm package with two completely independent capabilities:

**1. Offline pincode database** — look up any Indian pincode to get city, district, state, delivery status, GPS coordinates and post offices. Works in **Node.js, browser, and React Native**. No internet, no API key, no billing. Ever.

**2. Native current-location** (React Native only) — detect the user's current pincode using the device GPS + reverse-geocoding. Uses **Android's built-in Geocoder** (backed by Play Services, no API key) and **iOS's built-in CLGeocoder** (backed by Apple Maps, no API key). Merges the GPS result with the offline database for a richer combined response.

---

## Does it really need no API key?

Yes. Here is exactly what each piece uses:

| Feature | Technology | Network? | API key? | Cost? |
|---|---|---|---|---|
| Pincode lookup | Bundled data file (~1.5 MB) | ❌ Never | ❌ No | ❌ Free |
| GPS coordinates (Android) | `FusedLocationProviderClient` via Google Play Services | ❌ No (device GPS) | ❌ No | ❌ Free |
| GPS coordinates (iOS) | `CLLocationManager` | ❌ No (device GPS) | ❌ No | ❌ Free |
| Reverse geocode (Android) | `android.location.Geocoder` via Play Services | ⚠️ May use Google servers internally | ❌ No developer key | ❌ Free |
| Reverse geocode (iOS) | `CLGeocoder` via Apple Maps | ⚠️ May use Apple servers internally | ❌ No developer key | ❌ Free |
| GPS coordinates (browser) | `navigator.geolocation` | ❌ No (device GPS) | ❌ No | ❌ Free |

> **Honest note on reverse geocoding:** Android `Geocoder` and iOS `CLGeocoder` are platform-provided APIs — they don't need any API key from you and they don't charge you. Internally they may make server calls (Google or Apple, depending on the device), but that's handled entirely by the OS, completely transparently to your app. Our code makes zero HTTP calls of any kind.

---

## Quick Install

```bash
npm install pincode-india
```

**React Native — iOS only** (one extra step for native modules):
```bash
cd ios && pod install && cd ..
```

Android autolinking works out of the box — no extra steps.

---

## Table of Contents

- [Offline Lookup APIs](#offline-lookup-apis)
- [Location APIs (React Native)](#location-apis-react-native)
- [Platform Behaviour Matrix](#platform-behaviour-matrix)
- [Permissions Setup](#permissions-setup)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [Usage Examples](#usage-examples)
  - [React Native — full checkout flow](#react-native--full-checkout-flow)
  - [Node.js backend](#nodejs-backend)
  - [Browser / React web](#browser--react-web)
  - [Continuous location watch](#continuous-location-watch)
- [Architecture & How It Works](#architecture--how-it-works)
- [Data Coverage](#data-coverage)
- [Performance](#performance)
- [FAQ](#faq)
- [Migration from v1](#migration-from-v1)
- [Publishing to npm](#publishing-to-npm)

---

## Offline Lookup APIs

These work on **every platform** — Node.js, browser, React Native. No GPS, no internet, no permission.

### `lookup(pincode)`

Full details for a single pincode.

```typescript
import { lookup } from 'pincode-india';

const result = lookup('110001');
```

**Returns** `PincodeResult | null`

```typescript
{
  pincode:        "110001",
  city:           "New Delhi",
  district:       "New Delhi",
  state:          "Delhi",
  stateName:      "Delhi",
  circle:         "Delhi Circle",
  region:         "Delhi Region",
  officeType:     "HO",              // HO=Head, SO=Sub, PO=Post, BO=Branch
  deliveryStatus: "Delivery",        // or "Non-Delivery"
  lat:            28.626806,
  lng:            77.20663,
  offices: [
    { name: "New Delhi GPO", type: "HO", delivery: true },
    { name: "Parliament Street SO", type: "SO", delivery: false },
    // ... 21 more
  ]
}
```

Returns `null` if the pincode is not found, invalid format, or not 6 digits.

---

### `lookupMany(pincodes[])`

Batch lookup. Returns a map of `pincode → result`.

```typescript
import { lookupMany } from 'pincode-india';

const results = lookupMany(['110001', '400001', '560034', '999999']);

// {
//   '110001': { city: 'New Delhi', state: 'Delhi', ... },
//   '400001': { city: 'Mumbai', state: 'Maharashtra', ... },
//   '560034': { city: 'Koramangala', state: 'Karnataka', ... },
//   '999999': null
// }
```

---

### `isValid(pincode)`

Check if a pincode exists in the database.

```typescript
import { isValid } from 'pincode-india';

isValid('110001')  // true
isValid('000000')  // false  — doesn't exist
isValid('1100')    // false  — wrong length
isValid('ABCDEF')  // false  — not numeric
```

---

### `isDeliverable(pincode)`

Check if a pincode has India Post delivery service.

```typescript
import { isDeliverable } from 'pincode-india';

isDeliverable('110001')  // true
isDeliverable('110093')  // false — non-delivery office
isDeliverable('000000')  // false — doesn't exist
```

---

### `getState(pincode)` · `getDistrict(pincode)` · `getCity(pincode)`

Single-field quick accessors.

```typescript
import { getState, getDistrict, getCity } from 'pincode-india';

getState('400001')    // 'Maharashtra'
getDistrict('400001') // 'Mumbai'
getCity('400001')     // 'Mumbai'

getState('000000')    // null  — not found
```

---

### `getCoordinates(pincode)`

Get GPS coordinates for a pincode (from the bundled database).

```typescript
import { getCoordinates } from 'pincode-india';

getCoordinates('110001')
// { lat: 28.626806, lng: 77.20663 }

getCoordinates('000000')
// null
```

---

### `getPostOffices(pincode)`

Get all post offices under a pincode.

```typescript
import { getPostOffices } from 'pincode-india';

getPostOffices('110001')
// [
//   { name: 'New Delhi GPO',       type: 'HO', delivery: true },
//   { name: 'Parliament Street SO', type: 'SO', delivery: false },
//   { name: 'Connaught Place SO',   type: 'SO', delivery: true },
//   ... 20 more offices
// ]
```

---

### `getByState(state, options?)`

Get all pincodes in a state (string array).

```typescript
import { getByState } from 'pincode-india';

getByState('Goa')
// ['403001', '403002', '403004', ... 89 total]

getByState('Maharashtra', { deliveryOnly: true })
// only pincodes where deliveryStatus === 'Delivery'

getByState('goa')   // case-insensitive
getByState('GOA')   // case-insensitive
```

---

### `getByDistrict(state, district, options?)`

Get all pincodes in a specific district.

```typescript
import { getByDistrict } from 'pincode-india';

getByDistrict('Maharashtra', 'Mumbai')
// ['400001', '400002', '400003', ... 32 total]

getByDistrict('Karnataka', 'Bengaluru Urban')
// [...all Bengaluru urban district pincodes]
```

---

### `searchByCity(query, options?)`

Search pincodes by city or area name. Partial match supported.

```typescript
import { searchByCity } from 'pincode-india';

searchByCity('Bandra')
// [
//   { pincode: '400050', city: 'Bandra West', state: 'Maharashtra', ... },
//   { pincode: '400051', city: 'Bandra East', state: 'Maharashtra', ... },
//   ...
// ]

searchByCity('Koramangala')
// [{ pincode: '560034', city: 'Koramangala', state: 'Karnataka', ... }]

searchByCity('Connaught')
// matches any city/district with 'Connaught' in the name
```

Returns results sorted by exact match first, then partial matches.

---

### `getAllStates()`

Get a sorted list of all Indian states and Union Territories.

```typescript
import { getAllStates } from 'pincode-india';

getAllStates()
// [
//   'Andaman And Nicobar Islands',  // 22 pincodes
//   'Andhra Pradesh',               // 1247 pincodes
//   'Arunachal Pradesh',            // 51 pincodes
//   'Assam',                        // 577 pincodes
//   'Bihar',                        // 883 pincodes
//   'Chandigarh',                   // 23 pincodes
//   'Chhattisgarh',                 // 279 pincodes
//   'Delhi',                        // 103 pincodes
//   'Goa',                          // 89 pincodes
//   'Gujarat',                      // 1006 pincodes
//   'Haryana',                      // 318 pincodes
//   'Himachal Pradesh',             // 439 pincodes
//   'Jammu And Kashmir',            // 213 pincodes
//   'Jharkhand',                    // 387 pincodes
//   'Karnataka',                    // 1359 pincodes
//   'Kerala',                       // 1428 pincodes
//   'Ladakh',                       // 14 pincodes
//   'Lakshadweep',                  // 9 pincodes
//   'Madhya Pradesh',               // 778 pincodes
//   'Maharashtra',                  // 1600 pincodes
//   'Manipur',                      // 55 pincodes
//   'Meghalaya',                    // 68 pincodes
//   'Mizoram',                      // 44 pincodes
//   'Nagaland',                     // 46 pincodes
//   'Odisha',                       // 943 pincodes
//   'Puducherry',                   // 28 pincodes
//   'Punjab',                       // 531 pincodes
//   'Rajasthan',                    // 1017 pincodes
//   'Sikkim',                       // 19 pincodes
//   'Tamil Nadu',                   // 2040 pincodes
//   'Telangana',                    // 683 pincodes
//   'The Dadra And Nagar Haveli And Daman And Diu', // 9 pincodes
//   'Tripura',                      // 79 pincodes
//   'Uttar Pradesh',                // 1665 pincodes
//   'Uttarakhand',                  // 302 pincodes
//   'West Bengal'                   // 1131 pincodes
// ]
```

---

### `getDistricts(state)`

Get all districts for a given state.

```typescript
import { getDistricts } from 'pincode-india';

getDistricts('Maharashtra')
// ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
//  'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
//  'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Nagpur', 'Nanded',
//  'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune',
//  'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur',
//  'Thane', 'Wardha', 'Washim', 'Yavatmal']

getDistricts('Invalid State')  // []
```

---

### `preload()`

Pre-load all pincode data into memory. Call once at app startup to eliminate first-lookup latency.

```typescript
import { preload } from 'pincode-india';

// In your Express server index.js, Next.js layout.tsx,
// React Native App.tsx onCreate, etc.:
preload();
```

Without `preload()`, the data loads on the first `lookup()` call (~4ms). After that, all lookups are instant (~0.0002ms).

---

### `clearCache()`

Clear the in-memory cache. Mainly useful in tests.

```typescript
import { clearCache } from 'pincode-india';
clearCache();
```

---

## Location APIs (React Native)

These only work in **React Native**. They use native device GPS — no paid mapping APIs, no internet requirement for GPS itself.

### `requestLocationPermission()`

Request runtime location permission from the user.

```typescript
import { requestLocationPermission } from 'pincode-india';

const granted = await requestLocationPermission();
// true  — user granted permission
// false — user denied
```

- **Android**: shows the system dialog for `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`
- **iOS**: shows the system dialog using `NSLocationWhenInUseUsageDescription` from your Info.plist
- **Browser**: returns `true` immediately (browser prompts on first `getCurrentLocation()` call)
- **Node.js**: throws `UnsupportedPlatformError`

---

### `isLocationEnabled()`

Check if device location services (GPS) are turned on — separate from whether your app has permission.

```typescript
import { isLocationEnabled } from 'pincode-india';

const enabled = await isLocationEnabled();
if (!enabled) {
  // Tell user to turn on GPS in Settings
}
```

---

### `getCurrentLocation(options?)`

Get a single GPS fix.

```typescript
import { getCurrentLocation } from 'pincode-india';

const location = await getCurrentLocation({
  accuracy: 'high',   // 'high' | 'balanced' | 'low' — default 'high'
  timeout: 15000,     // ms before TimeoutError — default 15000
  maximumAge: 0,      // accept cached fix up to N ms old — default 0 (force fresh)
});

// {
//   latitude:  28.6139,
//   longitude: 77.2090,
//   accuracy:  10,          // meters
//   altitude:  216,         // meters (optional)
//   speed:     0,           // m/s (optional)
//   heading:   null,        // degrees from north (optional)
//   timestamp: 1700000000000
// }
```

- **Android**: `FusedLocationProviderClient.getCurrentLocation()` (high accuracy = GPS + network fusion)
- **iOS**: `CLLocationManager.requestLocation()` (one-shot, uses `kCLLocationAccuracyBest`)
- **Browser**: `navigator.geolocation.getCurrentPosition()`
- **Node.js**: throws `UnsupportedPlatformError`

---

### `getCurrentPincode(options?)`

Get the user's current pincode using GPS + native reverse-geocoding.

```typescript
import { getCurrentPincode } from 'pincode-india';

const result = await getCurrentPincode();

// {
//   pincode:  "110001",
//   city:     "New Delhi",
//   district: "New Delhi",
//   state:    "Delhi",
//   country:  "India",
//   latitude:  28.6139,
//   longitude: 77.2090,
//
//   offlineMatch: {          // ← present if pincode is in the bundled database
//     pincode: "110001",
//     city: "New Delhi",
//     district: "New Delhi",
//     state: "Delhi",
//     deliveryStatus: "Delivery",
//     lat: 28.626806,
//     lng: 77.20663,
//     offices: [
//       { name: "New Delhi GPO", type: "HO", delivery: true },
//       ... 22 more offices
//     ]
//   }
// }
```

**How it works internally:**
1. Calls `getCurrentLocation()` to get GPS coordinates
2. Passes coordinates to Android `Geocoder` or iOS `CLGeocoder` (no API key needed)
3. Gets back city/district/state/pincode from the OS geocoder
4. Looks up the returned pincode in the bundled offline database
5. If found, attaches the full offline record as `offlineMatch` and uses its district/state values (more consistent casing than raw geocoder output)

**Available on**: React Native only. Not available in browser or Node.js (no built-in reverse geocoder exists).

---

### `watchLocation(onUpdate, onError?, options?)`

Start continuous location updates. Returns a numeric watch ID.

```typescript
import { watchLocation, stopWatchingLocation } from 'pincode-india';

const watchId = watchLocation(
  (location) => {
    console.log('New position:', location.latitude, location.longitude);
  },
  (error) => {
    console.error('Watch error:', error.message);
  },
  {
    accuracy:       'high',
    interval:       5000,   // ms between updates — default 5000
    distanceFilter: 10,     // meters device must move before new update — default 10
    timeout:        15000,
  }
);

// Later, when done:
await stopWatchingLocation(watchId);
```

---

### `stopWatchingLocation(watchId)`

Stop a watch. Safe to call multiple times or with an unknown ID (no-op).

```typescript
await stopWatchingLocation(watchId);
```

---

## Platform Behaviour Matrix

| API | Node.js | Browser | React Native |
|---|---|---|---|
| `lookup` | ✅ | ✅ | ✅ |
| `lookupMany` | ✅ | ✅ | ✅ |
| `isValid` | ✅ | ✅ | ✅ |
| `isDeliverable` | ✅ | ✅ | ✅ |
| `getState / getDistrict / getCity` | ✅ | ✅ | ✅ |
| `getCoordinates` | ✅ | ✅ | ✅ |
| `getPostOffices` | ✅ | ✅ | ✅ |
| `getByState / getByDistrict` | ✅ | ✅ | ✅ |
| `searchByCity` | ✅ | ✅ | ✅ |
| `getAllStates / getDistricts` | ✅ | ✅ | ✅ |
| `requestLocationPermission` | ❌ UnsupportedPlatformError | ✅ (always true) | ✅ Native dialog |
| `isLocationEnabled` | ❌ UnsupportedPlatformError | ✅ checks navigator | ✅ Checks GPS |
| `getCurrentLocation` | ❌ UnsupportedPlatformError | ✅ navigator.geolocation | ✅ FusedLocation/CLLocation |
| `getCurrentPincode` | ❌ UnsupportedPlatformError | ❌ Not available | ✅ Geocoder/CLGeocoder + offline merge |
| `watchLocation` | ❌ throws sync | ✅ watchPosition | ✅ Native updates |
| `stopWatchingLocation` | ✅ no-op | ✅ clearWatch | ✅ Stops native |

---

## Permissions Setup

### Android

The library's `AndroidManifest.xml` declares the permissions automatically via manifest merging:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

You don't need to add these manually. Your app just needs to call `requestLocationPermission()` at runtime before using location APIs.

### iOS

Add these keys to your app's **own** `ios/YourApp/Info.plist`. Apple requires them to be project-specific (you can't ship generic boilerplate — App Store review will reject it).

```xml
<!-- Required — shown for "When In Use" authorization -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>
  [Your app name] uses your location to detect your current pincode
  for accurate delivery estimates at checkout.
</string>

<!-- Optional — only if you separately request "Always" auth in your own code -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>
  [Your app name] uses your location in the background to keep
  delivery estimates accurate.
</string>
```

> Without `NSLocationWhenInUseUsageDescription`, `requestLocationPermission()` will silently return `false` and `getCurrentLocation()` will throw `PermissionDeniedError`. The system never shows the permission prompt.

---

## Error Handling

Every location API throws one of these typed errors. Use `instanceof` or check `.code` for programmatic handling.

```typescript
import {
  PermissionDeniedError,
  LocationDisabledError,
  LocationUnavailableError,
  GeocoderError,
  TimeoutError,
  UnsupportedPlatformError,
} from 'pincode-india';

try {
  const result = await getCurrentPincode();
} catch (err) {

  if (err instanceof PermissionDeniedError) {
    // err.code === 'PERMISSION_DENIED'
    // User denied the permission prompt, or it was previously denied
    showAlert('Please allow location access in Settings.');
  }

  else if (err instanceof LocationDisabledError) {
    // err.code === 'LOCATION_DISABLED'
    // GPS/Location Services is switched off at device level
    showAlert('Please turn on Location Services in Settings.');
  }

  else if (err instanceof LocationUnavailableError) {
    // err.code === 'LOCATION_UNAVAILABLE'
    // GPS fix couldn't be obtained (indoors, no signal, native module not linked)
    showAlert('Could not detect your location. Please try again.');
  }

  else if (err instanceof GeocoderError) {
    // err.code === 'GEOCODER_ERROR'
    // GPS fix was obtained but reverse-geocoding failed (device offline, etc.)
    // The offline lookup APIs still work — only geocoding failed
    showAlert('Could not identify your area. Please enter pincode manually.');
  }

  else if (err instanceof TimeoutError) {
    // err.code === 'TIMEOUT'
    // The location request took longer than options.timeout (default 15s)
    showAlert('Location timed out. Please try again.');
  }

  else if (err instanceof UnsupportedPlatformError) {
    // err.code === 'UNSUPPORTED_PLATFORM'
    // Called on Node.js — location APIs aren't available there
    // message: 'Location APIs are not supported in Node.js'
  }
}
```

All error classes extend `PincodeIndiaLocationError` which extends `Error`:

```typescript
import { PincodeIndiaLocationError } from 'pincode-india';

catch (err) {
  if (err instanceof PincodeIndiaLocationError) {
    console.log(err.code);    // 'PERMISSION_DENIED' | 'LOCATION_DISABLED' | etc.
    console.log(err.message); // human-readable description
    console.log(err.name);    // 'PermissionDeniedError' | 'GeocoderError' | etc.
  }
}
```

---

## TypeScript Types

All types are exported from the package root:

```typescript
import type {
  // Offline lookup
  PincodeResult,
  PostOffice,
  LookupOptions,

  // Location
  LocationCoordinates,
  CurrentPincodeResult,
  LocationOptions,
  WatchLocationOptions,
  LocationWatchId,
  LocationUpdateCallback,
  LocationErrorCallback,

  // Errors (as values for instanceof, as types for type annotations)
} from 'pincode-india';
```

**`PincodeResult`** — returned by `lookup()`:
```typescript
interface PincodeResult {
  pincode:        string;
  city:           string;
  district:       string;
  state:          string;
  stateName:      string;
  circle:         string;
  region:         string;
  officeType:     string;    // 'HO' | 'SO' | 'PO' | 'BO'
  deliveryStatus: 'Delivery' | 'Non-Delivery';
  lat:            number | null;
  lng:            number | null;
  offices:        PostOffice[];
}

interface PostOffice {
  name:     string;
  type:     string;   // 'HO' | 'SO' | 'PO' | 'BO'
  delivery: boolean;
}
```

**`LocationCoordinates`** — returned by `getCurrentLocation()`:
```typescript
interface LocationCoordinates {
  latitude:   number;
  longitude:  number;
  accuracy:   number;    // meters
  altitude?:  number;
  speed?:     number;    // m/s
  heading?:   number;    // degrees from true north
  timestamp:  number;    // unix ms
}
```

**`CurrentPincodeResult`** — returned by `getCurrentPincode()`:
```typescript
interface CurrentPincodeResult {
  pincode:      string;
  city:         string;
  district:     string;
  state:        string;
  country:      string;
  latitude:     number;
  longitude:    number;
  offlineMatch?: PincodeResult;   // present if pincode is in offline DB
}
```

---

## Usage Examples

### React Native — full checkout flow

This is the most common use case: auto-detect pincode on checkout, with manual fallback.

```tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import {
  requestLocationPermission,
  isLocationEnabled,
  getCurrentPincode,
  lookup,
  isDeliverable,
  PermissionDeniedError,
  LocationDisabledError,
  GeocoderError,
} from 'pincode-india';

export function PincodeInput() {
  const [pincode, setPincode] = useState('');
  const [cityLabel, setCityLabel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-detect using GPS
  const handleDetect = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Please allow location access in Settings.');
        return;
      }

      const enabled = await isLocationEnabled();
      if (!enabled) {
        setError('Please turn on Location Services / GPS.');
        return;
      }

      const result = await getCurrentPincode({ timeout: 12000 });

      if (!result.pincode) {
        setError('Could not detect pincode. Please enter it manually.');
        return;
      }

      if (!isDeliverable(result.pincode)) {
        setError(`Sorry, we don't deliver to ${result.pincode} yet.`);
        return;
      }

      setPincode(result.pincode);
      setCityLabel(`${result.city}, ${result.state}`);

    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        setError('Location permission denied.');
      } else if (err instanceof LocationDisabledError) {
        setError('Please enable GPS / Location Services.');
      } else if (err instanceof GeocoderError) {
        setError('Could not identify area. Please enter pincode manually.');
      } else {
        setError('Could not detect location. Please enter pincode manually.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual entry
  const handleManualEntry = useCallback((value: string) => {
    setPincode(value);
    setError('');
    setCityLabel('');

    if (value.length === 6) {
      const result = lookup(value);
      if (!result) {
        setError('Invalid pincode.');
      } else if (!isDeliverable(value)) {
        setError(`Sorry, we don't deliver to ${value} yet.`);
      } else {
        setCityLabel(`${result.city}, ${result.state}`);
      }
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Deliver to</Text>

      <TextInput
        style={styles.input}
        value={pincode}
        onChangeText={handleManualEntry}
        placeholder="Enter 6-digit pincode"
        keyboardType="numeric"
        maxLength={6}
      />

      {cityLabel ? <Text style={styles.city}>{cityLabel}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleDetect}>
          <Text style={styles.buttonText}>📍 Detect my location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 12, fontSize: 16
  },
  city: { marginTop: 6, color: '#059669', fontSize: 14 },
  error: { marginTop: 6, color: '#dc2626', fontSize: 13 },
  button: {
    marginTop: 12, backgroundColor: '#2563eb', padding: 12,
    borderRadius: 8, alignItems: 'center'
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
```

---

### Node.js backend

All offline lookup APIs work perfectly — location APIs reject cleanly.

```typescript
import express from 'express';
import { lookup, isDeliverable, getByState, searchByCity, preload } from 'pincode-india';

// Preload at startup for instant responses (recommended for servers)
preload();

const app = express();
app.use(express.json());

// Validate pincode at checkout
app.post('/api/checkout/validate-pincode', (req, res) => {
  const { pincode } = req.body;
  const result = lookup(pincode);

  if (!result) {
    return res.status(400).json({ error: 'Invalid pincode' });
  }

  if (!isDeliverable(pincode)) {
    return res.status(400).json({
      error: 'Delivery not available',
      city: result.city,
      state: result.state,
    });
  }

  res.json({
    valid: true,
    pincode: result.pincode,
    city: result.city,
    district: result.district,
    state: result.state,
    deliveryAvailable: true,
  });
});

// List all serviceable pincodes for a state
app.get('/api/pincodes/state/:state', (req, res) => {
  const pincodes = getByState(req.params.state, { deliveryOnly: true });
  res.json({ state: req.params.state, count: pincodes.length, pincodes });
});

// Autocomplete for city/area search
app.get('/api/pincodes/search', (req, res) => {
  const results = searchByCity(req.query.q as string);
  res.json(results.slice(0, 20));
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### Browser / React web

Offline lookup works; `getCurrentLocation()` uses `navigator.geolocation`; `getCurrentPincode()` is not available (no built-in browser reverse geocoder).

```typescript
import { lookup, isValid, isDeliverable, getCurrentLocation } from 'pincode-india';

// Offline lookup — exactly the same as Node.js
const result = lookup('400050');
console.log(result?.city); // 'Bandra West'

// Validate on input
function validatePincode(value: string) {
  if (!isValid(value)) return { error: 'Invalid pincode' };
  if (!isDeliverable(value)) return { error: 'Not serviceable' };
  const r = lookup(value)!;
  return { ok: true, city: r.city, state: r.state };
}

// Get GPS coordinates in browser (no API key needed)
async function getBrowserCoords() {
  try {
    const coords = await getCurrentLocation({ timeout: 10000 });
    console.log(coords.latitude, coords.longitude);
    // Pair with your own geocoding service if you need reverse geocoding in browser
  } catch (err) {
    console.error(err.message);
  }
}
```

---

### Continuous location watch

```typescript
import { requestLocationPermission, watchLocation, stopWatchingLocation } from 'pincode-india';

async function startTracking() {
  const granted = await requestLocationPermission();
  if (!granted) return;

  const watchId = watchLocation(
    (location) => {
      console.log(
        `Updated: ${location.latitude}, ${location.longitude}`,
        `(accuracy: ${location.accuracy}m)`
      );
    },
    (error) => {
      console.error('Watch error:', error.message);
    },
    {
      accuracy: 'balanced',
      interval: 10000,       // every 10 seconds
      distanceFilter: 50,    // only if moved 50m
    }
  );

  // Stop after 5 minutes
  setTimeout(() => stopWatchingLocation(watchId), 5 * 60 * 1000);

  return watchId;
}
```

---

## Architecture & How It Works

```
pincode-india/
├── src/
│   ├── index.ts              ← Main entry: all v1 offline APIs + v2 location re-exports
│   ├── errors/index.ts       ← 6 typed error classes
│   ├── location/
│   │   ├── index.ts          ← Orchestration: routes calls by platform
│   │   ├── platform.ts       ← Runtime detection (node / react-native / browser)
│   │   ├── nativeBridge.ts   ← Lazy-loads TurboModule → NativeModules fallback
│   │   ├── browserAdapter.ts ← navigator.geolocation wrapper
│   │   └── types.ts          ← All location TypeScript interfaces
│   └── NativePincodeIndia.ts ← New Architecture (TurboModule) codegen spec
├── android/
│   ├── build.gradle
│   ├── src/main/AndroidManifest.xml
│   └── src/main/java/com/pincodeindia/
│       ├── PincodeIndiaModule.kt    ← FusedLocationProviderClient + Geocoder
│       └── PincodeIndiaPackage.kt   ← Registers module with RN bridge
├── ios/
│   ├── PincodeIndia.swift           ← CLLocationManager + CLGeocoder
│   ├── PincodeIndia.m               ← Obj-C bridge header
│   └── Info.plist.example           ← Template for host app Info.plist
├── data/
│   ├── pincodes.json.gz             ← 1.5MB compressed, 19.5K pincodes
│   └── states-districts.json.gz    ← State→district→pincodes index
└── dist/
    ├── index.js   ← CJS build
    ├── index.mjs  ← ESM build
    └── index.d.ts ← TypeScript declarations
```

**Key design decisions:**

- **Lazy native module loading**: `nativeBridge.ts` only calls `require('react-native')` inside the bridge function, not at module-evaluation time. This means importing `pincode-india` in Node.js/browser never touches react-native at all — zero bundle size impact and zero startup cost for non-location consumers.
- **Zero runtime dependencies**: the package.json has no `dependencies` field. The bundled data file and pure TypeScript orchestration are the entire runtime.
- **TurboModule first**: the native bridge checks `TurboModuleRegistry.get('PincodeIndia')` first (New Architecture), then falls back to `NativeModules.PincodeIndia` (legacy bridge).
- **Offline DB merge**: `getCurrentPincode()` always tries to enrich the geocoder result with the offline DB. If the geocoder returns `110001`, you get not just city/state but also all 23 post offices, delivery status, India Post circle/region, and curated casing.

---

## Data Coverage

| Metric | Value |
|---|---|
| Total unique pincodes | 19,500+ |
| Total post offices | 165,000+ |
| States / Union Territories | 36 |
| Data source | India Post (via verified public dataset) |
| Compressed data size | ~1.5 MB |
| In-memory size (after loading) | ~13 MB |
| Pincodes with GPS coordinates | ~99% |
| Pincodes with delivery status | 100% |

**Top states by pincode count:**

| State | Pincodes |
|---|---|
| Tamil Nadu | 2,040 |
| Uttar Pradesh | 1,665 |
| Maharashtra | 1,600 |
| Karnataka | 1,359 |
| Kerala | 1,428 |
| West Bengal | 1,131 |
| Andhra Pradesh | 1,247 |
| Rajasthan | 1,017 |
| Gujarat | 1,006 |
| Bihar | 883 |

---

## Performance

```
Preload (first call): ~4ms
Subsequent lookups:   ~0.0002ms each
100,000 lookups:      ~16ms total
Memory footprint:     ~13MB (data) + ~20KB (dist/index.js)
```

All numbers measured on Node.js 20, Apple M1. React Native performance is comparable (native bridge overhead is amortized across the JS → native call, not the data lookup itself).

The offline database loads **once** on first use and is cached in memory. All subsequent lookups hit the in-memory map directly.

---

## FAQ

**Q: Does it really work with no internet?**
A: The offline lookup APIs (`lookup`, `getByState`, `searchByCity`, etc.) work 100% offline — the data is bundled in the package. The location APIs use device GPS (no internet) for coordinates. Reverse geocoding (`getCurrentPincode`) may use the OS's geocoding server internally on some devices, but that's handled by the OS — your app makes zero HTTP calls.

**Q: Does it need Google Maps API?**
A: No. Never. Not for lookup, not for GPS, not for reverse geocoding.

**Q: What about Mappls / MapMyIndia / HERE / OpenStreetMap?**
A: None of these are used. The offline lookup is just a local JSON file. Reverse geocoding uses `android.location.Geocoder` (Android) and `CLGeocoder` (iOS) — both are built into the OS.

**Q: Does it work in Expo?**
A: It works in Expo with a [custom development build](https://docs.expo.dev/develop/development-builds/introduction/) (bare workflow / EAS Build). It does **not** work in Expo Go because Expo Go only includes a fixed set of pre-linked native modules.

**Q: What if the user's location has a non-deliverable pincode?**
A: `getCurrentPincode()` returns the pincode regardless. Check `isDeliverable(result.pincode)` after the call to make the delivery decision.

**Q: What if reverse geocoding doesn't return a pincode?**
A: The `pincode` field in `CurrentPincodeResult` may be an empty string `""` on some devices or areas where the OS geocoder doesn't have pincode data. Always check `result.pincode` before using it. Fall back to manual entry in that case.

**Q: Will it work on Android without Google Play Services?**
A: `FusedLocationProviderClient` requires Play Services. On AOSP or custom ROMs without Play Services, the native module will throw `LocationUnavailableError`. The offline lookup still works fine.

**Q: What about React Native New Architecture / TurboModules?**
A: Fully supported. The package includes a `NativePincodeIndia.ts` codegen spec. TurboModuleRegistry is checked first; NativeModules is the fallback. No code changes needed in your app — autolinking handles it.

**Q: The state shows 'Haryana' but I expected a district name. Why?**
A: Some NDC (National Defence Cantonment) pincodes in the India Post dataset don't have district data. The package fills in the state name as a fallback so those pincodes still return usable results instead of `null`.

---

## Migration from v1

**Zero breaking changes.** `pincode-india@2.0.0` is a drop-in replacement:

```bash
npm install pincode-india@^2.0.0
cd ios && pod install   # iOS only
```

All v1 functions (`lookup`, `getByState`, `searchByCity`, etc.) have identical signatures and behavior. All 44 original tests pass unchanged. The only difference is that 22 new functions, 6 error classes, and 8 types are now also exported.

---

## Publishing to npm

```bash
# After cloning or unzipping:
cd pincode-india
npm install

# Verify everything passes
npm run build      # compiles TypeScript → dist/
npm test           # 106 tests pass
npm run lint       # zero warnings
npm run typecheck  # zero errors

# First publish
npm login          # requires 2FA + granular access token
npm publish --access public

# Later releases
npm version patch  # bug fix: 2.0.0 → 2.0.1
npm version minor  # new feature: 2.0.1 → 2.1.0
npm version major  # breaking change: 2.1.0 → 3.0.0

npm publish
```

**GitHub → auto-publish setup:**

1. Generate a granular npm token scoped to `pincode-india` with Publish permission
2. Add as `NPM_TOKEN` secret in GitHub repo Settings → Secrets → Actions
3. Push a version tag: `git push origin --follow-tags`
4. GitHub Actions CI runs lint → typecheck → test → build → `npm publish` automatically

---

## License

MIT © [technoxys](https://github.com/technoxys)

---

*Built with ❤️ for the Indian developer ecosystem.*
*No Google Maps. No Mappls. No HERE. No OpenStreetMap. No API keys. Ever.*
