# 🇮🇳 pincode-india

> **Fast, offline Indian Pincode & Current Location library for Node.js, React, React Native, Next.js and modern browsers.**

![npm](https://img.shields.io/npm/v/pincode-india)
![downloads](https://img.shields.io/npm/dm/pincode-india)
![license](https://img.shields.io/npm/l/pincode-india)
![typescript](https://img.shields.io/badge/TypeScript-Supported-blue)
![react-native](https://img.shields.io/badge/React%20Native-Supported-success)
![platform](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS%20%7C%20Web%20%7C%20Node-success)

A production-ready TypeScript library for working with Indian PIN Codes and device location.

`pincode-india` provides **offline pincode lookup**, **native current location support** for React Native, **browser geolocation**, and **zero API-key** reverse geocoding using the operating system's built-in services.

Perfect for:

* E-commerce
* Quick Commerce
* Logistics
* Food Delivery
* Grocery Apps
* FinTech
* Banking
* Healthcare
* Government Portals
* CRM & ERP
* Address Forms
* React Native Apps

---

# ✨ Features

## 📦 Offline Pincode Database

* 19,500+ Indian PIN Codes
* 165,000+ India Post Offices
* State
* District
* City
* Latitude
* Longitude
* Delivery Status

Works completely offline.

No API calls.

No internet required.

---

## 📍 Native Current Location

### Android

* Google Fused Location Provider
* Android Geocoder
* Runtime Permissions

### iOS

* CoreLocation
* CLGeocoder
* Native Swift implementation

### Browser

* navigator.geolocation support

### Node.js

Lookup APIs supported.

Location APIs gracefully report unsupported.

---

# 🚀 Installation

## npm

```bash
npm install pincode-india
```

## Yarn

```bash
yarn add pincode-india
```

## pnpm

```bash
pnpm add pincode-india
```

---

# 📱 React Native Installation

### iOS

```bash
cd ios
pod install
```

---

### Android

No additional setup required.

Autolinking is supported.

---

# 🔐 Permissions

## Android

Add to `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>

<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

---

## iOS

Add to `Info.plist`

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to detect your current pincode.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location to detect your current pincode.</string>
```

---

# 📖 Import

```ts
import {
  lookup,
  lookupMany,
  isValid,
  isDeliverable,
  getState,
  getDistrict,
  getCity,
  getCoordinates,
  getPostOffices,
  getByState,
  getByDistrict,
  searchByCity,
  getDistricts,
  getAllStates,
  preload,

  requestLocationPermission,
  isLocationEnabled,
  getCurrentLocation,
  getCurrentPincode,
  watchLocation,
  stopWatchingLocation
} from "pincode-india";
```

---

# 📌 Offline Lookup

```ts
const data = lookup("110001");

console.log(data);
```

Returns

```ts
{
  pincode: "110001",
  city: "New Delhi",
  district: "Central Delhi",
  state: "Delhi",
  latitude: 28.6328,
  longitude: 77.2197,
  deliverable: true,
  postOffices: [...]
}
```

---

# 📍 Get Current Location

```ts
const location = await getCurrentLocation();

console.log(location);
```

Returns

```ts
{
  latitude: 28.6139,
  longitude: 77.2090,
  accuracy: 8.5,
  altitude: 214,
  speed: 0,
  heading: 0,
  timestamp: 1719393000
}
```

---

# 📮 Get Current Pincode

```ts
const address = await getCurrentPincode();

console.log(address);
```

Returns

```ts
{
  pincode: "110001",
  city: "New Delhi",
  district: "Central Delhi",
  state: "Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.2090,
  deliverable: true,
  postOffices: [...]
}
```

---

# 🔑 Request Permission

```ts
const granted = await requestLocationPermission();

if (!granted) {
  console.log("Permission denied");
}
```

---

# 📡 Check GPS

```ts
const enabled = await isLocationEnabled();

console.log(enabled);
```

---

# 👀 Watch Location

```ts
const watchId = watchLocation((location) => {
  console.log(location);
});
```

Stop watching

```ts
stopWatchingLocation(watchId);
```

---

# 📚 API Reference

## lookup(pin)

Returns complete information about a pincode.

```ts
lookup("560001");
```

---

## lookupMany()

Lookup multiple pincodes.

```ts
lookupMany([
  "110001",
  "560001",
  "400001"
]);
```

---

## isValid()

```ts
isValid("110001");
```

Returns

```ts
true
```

---

## isDeliverable()

```ts
isDeliverable("110001");
```

---

## getState()

```ts
getState("560001");
```

---

## getDistrict()

```ts
getDistrict("560001");
```

---

## getCity()

```ts
getCity("560001");
```

---

## getCoordinates()

```ts
getCoordinates("560001");
```

---

## getPostOffices()

```ts
getPostOffices("560001");
```

---

## getByState()

```ts
getByState("Maharashtra");
```

---

## getByDistrict()

```ts
getByDistrict(
  "Maharashtra",
  "Mumbai"
);
```

---

## searchByCity()

```ts
searchByCity("Bandra");
```

---

## getDistricts()

```ts
getDistricts("Punjab");
```

---

## getAllStates()

```ts
getAllStates();
```

---

## preload()

```ts
preload();
```

Recommended for backend servers.

---

# ⚛️ React Example

```tsx
const data = lookup(pin);

<Text>{data.city}</Text>
```

---

# 📱 React Native Example

```tsx
useEffect(() => {
  async function init() {
    await requestLocationPermission();

    const address = await getCurrentPincode();

    console.log(address);
  }

  init();
}, []);
```

---

# 🌐 Browser Example

```ts
const location = await getCurrentLocation();

console.log(location);
```

Browser returns coordinates only.

Reverse geocoding is not performed in browsers.

---

# 🖥 Node.js Example

```ts
const data = lookup("110001");
```

Location APIs throw an unsupported platform error.

---

# ⚡ Performance

| Feature          | Performance |
| ---------------- | ----------- |
| Offline Lookup   | < 1 ms      |
| Dependencies     | 0           |
| Offline Database | ~1.5 MB     |
| TypeScript       | ✅           |
| Tree Shakeable   | ✅           |
| React Native     | ✅           |
| Browser          | ✅           |
| Node.js          | ✅           |

---

# 🏗 Platform Support

| Platform             | Lookup | Current Location    |
| -------------------- | ------ | ------------------- |
| Node.js              | ✅      | ❌                   |
| Browser              | ✅      | ✅ Coordinates Only  |
| React                | ✅      | Browser Geolocation |
| React Native Android | ✅      | ✅                   |
| React Native iOS     | ✅      | ✅                   |
| Next.js              | ✅      | Client Only         |

---

# ⚠️ Errors

The library may throw:

* PermissionDeniedError
* LocationDisabledError
* LocationUnavailableError
* GeocoderError
* TimeoutError

Always wrap location methods in `try/catch`.

---

# 📂 Data Source

The offline database is generated from publicly available India Post postal data.

Includes:

* PIN Code
* City
* District
* State
* Latitude
* Longitude
* Delivery Status
* Post Office Information

---

# 🧪 Testing

```bash
npm install

npm run lint

npm run build

npm test
```

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

# 📄 License

MIT License

---

# ❤️ Author

Made with ❤️ for the Indian developer community.

If you find this package useful, please consider giving it a ⭐ on GitHub.
