import PincodeIndia, {
  // v1 — must remain unchanged
  lookup,
  isValid,
  getState,
  // v2 — new location APIs
  requestLocationPermission,
  isLocationEnabled,
  getCurrentLocation,
  getCurrentPincode,
  watchLocation,
  stopWatchingLocation,
  PermissionDeniedError,
  LocationDisabledError,
  LocationUnavailableError,
  GeocoderError,
  TimeoutError,
  UnsupportedPlatformError,
} from '../src/index';

describe('v2.0.0 public API surface', () => {
  test('v1 offline APIs are still exported and functional', () => {
    expect(typeof lookup).toBe('function');
    expect(typeof isValid).toBe('function');
    expect(typeof getState).toBe('function');
    expect(lookup('110001')?.state).toBe('Delhi');
  });

  test('v2 location functions are exported from package root', () => {
    expect(typeof requestLocationPermission).toBe('function');
    expect(typeof isLocationEnabled).toBe('function');
    expect(typeof getCurrentLocation).toBe('function');
    expect(typeof getCurrentPincode).toBe('function');
    expect(typeof watchLocation).toBe('function');
    expect(typeof stopWatchingLocation).toBe('function');
  });

  test('all custom error classes are exported from package root', () => {
    expect(typeof PermissionDeniedError).toBe('function');
    expect(typeof LocationDisabledError).toBe('function');
    expect(typeof LocationUnavailableError).toBe('function');
    expect(typeof GeocoderError).toBe('function');
    expect(typeof TimeoutError).toBe('function');
    expect(typeof UnsupportedPlatformError).toBe('function');
  });

  test('default export object includes both v1 and v2 functions', () => {
    // v1
    expect(typeof PincodeIndia.lookup).toBe('function');
    expect(typeof PincodeIndia.isValid).toBe('function');
    expect(typeof PincodeIndia.getByState).toBe('function');
    // v2
    expect(typeof PincodeIndia.requestLocationPermission).toBe('function');
    expect(typeof PincodeIndia.getCurrentLocation).toBe('function');
    expect(typeof PincodeIndia.getCurrentPincode).toBe('function');
    expect(typeof PincodeIndia.watchLocation).toBe('function');
    expect(typeof PincodeIndia.stopWatchingLocation).toBe('function');
  });

  test('error instances thrown from default export functions are instanceof exported classes', async () => {
    delete (global as any).navigator;
    delete (global as any).window;

    await expect(PincodeIndia.requestLocationPermission()).rejects.toBeInstanceOf(
      UnsupportedPlatformError
    );
  });
});
