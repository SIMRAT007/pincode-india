// We mock the 'react-native' module entirely since it isn't actually
// installed as a runtime dependency (it's a peerDependency) and would
// otherwise throw when required in a plain Node/Jest environment.
function mockReactNative(mockExports: any) {
  jest.doMock('react-native', () => mockExports, { virtual: true });
}

describe('nativeBridge', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('react-native');
  });

  test('getNativeModule() returns null when react-native cannot be required', () => {
    jest.doMock('react-native', () => {
      throw new Error('Cannot find module react-native');
    }, { virtual: true });

    const { getNativeModule } = require('../../src/location/nativeBridge');
    expect(getNativeModule()).toBeNull();
  });

  test('getNativeModule() prefers TurboModuleRegistry when available', () => {
    const turboModule = { requestLocationPermission: jest.fn() };
    mockReactNative({
      TurboModuleRegistry: { get: jest.fn(() => turboModule) },
      NativeModules: { PincodeIndia: { legacy: true } },
    });

    const { getNativeModule } = require('../../src/location/nativeBridge');
    const result = getNativeModule();

    expect(result).toBe(turboModule);
  });

  test('getNativeModule() falls back to NativeModules.PincodeIndia under legacy bridge', () => {
    const legacyModule = { requestLocationPermission: jest.fn() };
    mockReactNative({
      TurboModuleRegistry: { get: jest.fn(() => null) },
      NativeModules: { PincodeIndia: legacyModule },
    });

    const { getNativeModule } = require('../../src/location/nativeBridge');
    const result = getNativeModule();

    expect(result).toBe(legacyModule);
  });

  test('getNativeModule() returns null when neither TurboModuleRegistry nor NativeModules has it', () => {
    mockReactNative({
      TurboModuleRegistry: { get: jest.fn(() => null) },
      NativeModules: {},
    });

    const { getNativeModule } = require('../../src/location/nativeBridge');
    expect(getNativeModule()).toBeNull();
  });

  test('getNativeModule() caches its result across calls', () => {
    const getFn = jest.fn(() => ({ resolved: true }));
    mockReactNative({
      TurboModuleRegistry: { get: getFn },
      NativeModules: {},
    });

    const { getNativeModule } = require('../../src/location/nativeBridge');
    getNativeModule();
    getNativeModule();
    getNativeModule();

    expect(getFn).toHaveBeenCalledTimes(1);
  });

  test('requireNativeModule() throws LocationUnavailableError when module is not linked', () => {
    jest.doMock('react-native', () => {
      throw new Error('not found');
    }, { virtual: true });

    const { requireNativeModule } = require('../../src/location/nativeBridge');
    expect(() => requireNativeModule()).toThrow(/Native PincodeIndia module not found/);
    try {
      requireNativeModule();
      fail('expected requireNativeModule to throw');
    } catch (err: any) {
      expect(err.code).toBe('LOCATION_UNAVAILABLE');
      expect(err.name).toBe('LocationUnavailableError');
    }
  });

  test('requireNativeModule() returns the module when available', () => {
    const turboModule = { requestLocationPermission: jest.fn() };
    mockReactNative({
      TurboModuleRegistry: { get: jest.fn(() => turboModule) },
      NativeModules: {},
    });

    const { requireNativeModule } = require('../../src/location/nativeBridge');
    expect(requireNativeModule()).toBe(turboModule);
  });
});
