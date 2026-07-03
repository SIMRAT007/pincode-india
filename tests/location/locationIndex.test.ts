import { __resetRuntimeCache } from '../../src/location/platform';
import { __resetNativeModuleCache } from '../../src/location/nativeBridge';
import { UnsupportedPlatformError, LocationUnavailableError } from '../../src/errors';

/**
 * Helper to fully reset module state between tests: clears the
 * runtime/native-module caches and re-requires the location module so
 * each test starts from a clean slate regardless of global mutation
 * from a previous test.
 */
function freshLocationModule() {
  jest.resetModules();
  return require('../../src/location/index');
}

function setGlobalsForNode() {
  delete (global as any).navigator;
  delete (global as any).window;

  // Explicitly virtual-mock 'react-native' as unresolvable, rather than
  // relying on the real `require('react-native')` to fail naturally.
  // Jest's module resolver can memoize a failed real resolution across
  // `jest.resetModules()` calls within the same test file, which would
  // otherwise leak a "module not found" state into later React Native
  // test blocks that explicitly mock it as present.
  jest.doMock(
    'react-native',
    () => {
      throw new Error('Cannot find module react-native');
    },
    { virtual: true }
  );
}

function setGlobalsForReactNative(nativeModuleOverrides: any = {}) {
  (global as any).navigator = { product: 'ReactNative' };
  delete (global as any).window;

  jest.doMock(
    'react-native',
    () => ({
      TurboModuleRegistry: { get: () => null },
      NativeModules: {
        PincodeIndia: {
          requestLocationPermission: jest.fn(() => Promise.resolve(true)),
          isLocationEnabled: jest.fn(() => Promise.resolve(true)),
          getCurrentLocation: jest.fn(() =>
            Promise.resolve({
              latitude: 28.6139,
              longitude: 77.209,
              accuracy: 10,
              timestamp: 1700000000000,
            })
          ),
          reverseGeocode: jest.fn(() =>
            Promise.resolve({
              pincode: '110001',
              city: 'New Delhi',
              district: 'New Delhi',
              state: 'Delhi',
              country: 'India',
              latitude: 28.6139,
              longitude: 77.209,
            })
          ),
          startWatching: jest.fn(() => Promise.resolve(1)),
          stopWatching: jest.fn(() => Promise.resolve()),
          ...nativeModuleOverrides,
        },
      },
    }),
    { virtual: true }
  );
}

function setGlobalsForBrowser() {
  (global as any).navigator = { product: 'Gecko', geolocation: {} };
  (global as any).window = { document: {} };
}

const originalNavigator = (global as any).navigator;
const originalWindow = (global as any).window;

afterEach(() => {
  __resetRuntimeCache();
  __resetNativeModuleCache();
  jest.dontMock('react-native');
  jest.resetModules();
  (global as any).navigator = originalNavigator;
  (global as any).window = originalWindow;
});

// ─── Node.js: all location APIs must reject ───────────────────────────────

describe('Location APIs on Node.js', () => {
  beforeEach(() => {
    setGlobalsForNode();
  });

  test('requestLocationPermission() rejects with UnsupportedPlatformError', async () => {
    const { requestLocationPermission } = freshLocationModule();
    await expect(requestLocationPermission()).rejects.toThrow(
      'Location APIs are not supported in Node.js'
    );
  });

  test('isLocationEnabled() rejects with UnsupportedPlatformError', async () => {
    const { isLocationEnabled } = freshLocationModule();
    await expect(isLocationEnabled()).rejects.toThrow(
      'Location APIs are not supported in Node.js'
    );
  });

  test('getCurrentLocation() rejects with UnsupportedPlatformError', async () => {
    const { getCurrentLocation } = freshLocationModule();
    await expect(getCurrentLocation()).rejects.toThrow(
      'Location APIs are not supported in Node.js'
    );
  });

  test('getCurrentPincode() rejects with UnsupportedPlatformError', async () => {
    const { getCurrentPincode } = freshLocationModule();
    await expect(getCurrentPincode()).rejects.toThrow(
      'Location APIs are not supported in Node.js'
    );
  });

  test('watchLocation() throws synchronously with UnsupportedPlatformError', () => {
    const { watchLocation } = freshLocationModule();
    expect(() => watchLocation(() => {})).toThrow(
      'Location APIs are not supported in Node.js'
    );
  });

  test('rejected error has UNSUPPORTED_PLATFORM code', async () => {
    const { getCurrentLocation } = freshLocationModule();
    try {
      await getCurrentLocation();
      fail('expected rejection');
    } catch (err: any) {
      expect(err.code).toBe('UNSUPPORTED_PLATFORM');
    }
  });

  test('offline lookup APIs are unaffected on Node.js', () => {
    const { lookup } = require('../../src/index');
    const result = lookup('110001');
    expect(result?.state).toBe('Delhi');
  });
});

// ─── React Native: native module routing ──────────────────────────────────

describe('Location APIs on React Native', () => {
  test('requestLocationPermission() delegates to native module', async () => {
    setGlobalsForReactNative();
    const { requestLocationPermission } = freshLocationModule();

    const result = await requestLocationPermission();
    expect(result).toBe(true);
  });

  test('isLocationEnabled() delegates to native module', async () => {
    setGlobalsForReactNative();
    const { isLocationEnabled } = freshLocationModule();

    const result = await isLocationEnabled();
    expect(result).toBe(true);
  });

  test('getCurrentLocation() returns native coordinates', async () => {
    setGlobalsForReactNative();
    const { getCurrentLocation } = freshLocationModule();

    const result = await getCurrentLocation();
    expect(result.latitude).toBe(28.6139);
    expect(result.longitude).toBe(77.209);
    expect(result.accuracy).toBe(10);
  });

  test('getCurrentPincode() merges native geocode with offline DB', async () => {
    setGlobalsForReactNative();
    const { getCurrentPincode } = freshLocationModule();

    const result = await getCurrentPincode();
    expect(result.pincode).toBe('110001');
    expect(result.city).toBe('New Delhi');
    // Offline DB merge should attach offlineMatch with post offices etc.
    expect(result.offlineMatch).toBeDefined();
    expect(result.offlineMatch?.offices.length).toBeGreaterThan(0);
    expect(result.offlineMatch?.deliveryStatus).toBeDefined();
  });

  test('getCurrentPincode() prefers offline district/state when offline match exists', async () => {
    setGlobalsForReactNative({
      reverseGeocode: jest.fn(() =>
        Promise.resolve({
          pincode: '110001',
          city: 'Some Geocoder City Name',
          district: 'Some Geocoder District',
          state: 'Some Geocoder State',
          country: 'India',
          latitude: 28.6139,
          longitude: 77.209,
        })
      ),
    });
    const { getCurrentPincode } = freshLocationModule();

    const result = await getCurrentPincode();
    // District/state should be overridden by the curated offline DB values.
    expect(result.district).toBe('New Delhi');
    expect(result.state).toBe('Delhi');
  });

  test('getCurrentPincode() returns geocoder-only result when pincode not in offline DB', async () => {
    setGlobalsForReactNative({
      reverseGeocode: jest.fn(() =>
        Promise.resolve({
          pincode: '999999',
          city: 'Nowhere',
          district: 'Nowhere District',
          state: 'Nowhere State',
          country: 'India',
          latitude: 0,
          longitude: 0,
        })
      ),
    });
    const { getCurrentPincode } = freshLocationModule();

    const result = await getCurrentPincode();
    expect(result.pincode).toBe('999999');
    expect(result.offlineMatch).toBeUndefined();
  });

  test('watchLocation() returns a numeric watch id', async () => {
    setGlobalsForReactNative();
    const { watchLocation } = freshLocationModule();

    const onUpdate = jest.fn();
    const watchId = watchLocation(onUpdate);

    expect(typeof watchId).toBe('number');
    expect(watchId).toBeGreaterThan(0);
  });

  test('stopWatchingLocation() resolves without throwing for an active watch', async () => {
    setGlobalsForReactNative();
    const { watchLocation, stopWatchingLocation } = freshLocationModule();

    const watchId = watchLocation(() => {});
    // allow the async startWatching() promise to settle
    await new Promise((r) => setTimeout(r, 0));

    await expect(stopWatchingLocation(watchId)).resolves.toBeUndefined();
  });

  test('stopWatchingLocation() is a safe no-op for unknown watch ids', async () => {
    setGlobalsForReactNative();
    const { stopWatchingLocation } = freshLocationModule();

    await expect(stopWatchingLocation(99999)).resolves.toBeUndefined();
  });

  test('getCurrentLocation() rejects with mapped error when native module rejects', async () => {
    setGlobalsForReactNative({
      getCurrentLocation: jest.fn(() => Promise.reject(new Error('boom'))),
    });
    const { getCurrentLocation } = freshLocationModule();

    await expect(getCurrentLocation()).rejects.toThrow('boom');
  });

  test('throws LocationUnavailableError when native module is not linked', async () => {
    (global as any).navigator = { product: 'ReactNative' };
    delete (global as any).window;
    jest.doMock(
      'react-native',
      () => ({
        TurboModuleRegistry: { get: () => null },
        NativeModules: {},
      }),
      { virtual: true }
    );

    const { getCurrentLocation } = freshLocationModule();
    await expect(getCurrentLocation()).rejects.toThrow(/Native PincodeIndia module not found/);
  });
});

// ─── Browser: coordinates-only fallback ────────────────────────────────────

describe('Location APIs in the browser', () => {
  beforeEach(() => {
    setGlobalsForBrowser();
  });

  test('requestLocationPermission() resolves true immediately (browser prompts on first use)', async () => {
    const { requestLocationPermission } = freshLocationModule();
    await expect(requestLocationPermission()).resolves.toBe(true);
  });

  test('isLocationEnabled() resolves true when navigator.geolocation exists', async () => {
    const { isLocationEnabled } = freshLocationModule();
    await expect(isLocationEnabled()).resolves.toBe(true);
  });

  test('getCurrentLocation() routes to navigator.geolocation', async () => {
    (global as any).navigator.geolocation = {
      getCurrentPosition: (success: any) =>
        success({
          coords: {
            latitude: 12.97,
            longitude: 77.59,
            accuracy: 20,
            altitude: null,
            speed: null,
            heading: null,
          },
          timestamp: 1700000000000,
        }),
    };

    const { getCurrentLocation } = freshLocationModule();
    const result = await getCurrentLocation();
    expect(result.latitude).toBe(12.97);
    expect(result.longitude).toBe(77.59);
  });

  test('getCurrentPincode() rejects — no built-in browser reverse geocoder', async () => {
    const { getCurrentPincode } = freshLocationModule();
    await expect(getCurrentPincode()).rejects.toThrow(/not available in the browser/);
  });

  test('getCurrentPincode() error is a LocationUnavailableError', async () => {
    const { getCurrentPincode } = freshLocationModule();
    try {
      await getCurrentPincode();
      fail('expected rejection');
    } catch (err: any) {
      expect(err.code).toBe('LOCATION_UNAVAILABLE');
    }
  });
});

// ─── Timeout handling ──────────────────────────────────────────────────────

describe('Location request timeout handling', () => {
  test('getCurrentLocation() rejects with TimeoutError if native module never settles', async () => {
    setGlobalsForReactNative({
      getCurrentLocation: jest.fn(() => new Promise(() => {})), // never resolves
    });
    const { getCurrentLocation } = freshLocationModule();

    await expect(
      getCurrentLocation({ timeout: 50 })
    ).rejects.toThrow('Location request timed out.');
  }, 1000);
});
