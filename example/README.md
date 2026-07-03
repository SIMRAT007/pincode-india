# pincode-india Example App

A minimal React Native app demonstrating every `pincode-india` v2 API:
permission requests, current GPS location, current-pincode resolution
(native reverse-geocoding merged with the offline database), plain
offline lookup, and city search.

## Setup

This example assumes a standard React Native CLI project (not Expo Go,
since native modules require a custom dev client / bare workflow).

```bash
# From a fresh RN project created with:
npx @react-native-community/cli init PincodeIndiaExample

cd PincodeIndiaExample
npm install pincode-india

# Copy this folder's src/App.tsx over the generated App.tsx
cp ../example/src/App.tsx ./App.tsx
```

### Android

```bash
# Add to android/app/src/main/AndroidManifest.xml (merged automatically
# from the library's own manifest, but double check after a clean build):
#   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
#   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

npx react-native run-android
```

### iOS

```bash
cd ios && pod install && cd ..

# Add to ios/PincodeIndiaExample/Info.plist (see ../ios/Info.plist.example):
#   NSLocationWhenInUseUsageDescription

npx react-native run-ios
```

## What it demonstrates

1. `requestLocationPermission()` — runtime permission prompt
2. `getCurrentLocation()` — raw GPS coordinates
3. `getCurrentPincode()` — native reverse-geocode, merged with the
   offline India Post database (post offices, delivery status)
4. `lookup()` — pure offline pincode lookup, no GPS/permission required
5. `searchByCity()` — partial city-name search against the offline DB
