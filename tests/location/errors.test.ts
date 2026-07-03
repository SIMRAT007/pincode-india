import {
  PincodeIndiaLocationError,
  PermissionDeniedError,
  LocationDisabledError,
  LocationUnavailableError,
  GeocoderError,
  TimeoutError,
  UnsupportedPlatformError,
} from '../../src/errors';

describe('Custom location errors', () => {
  test('PincodeIndiaLocationError carries a code and message', () => {
    const err = new PincodeIndiaLocationError('something broke', 'CUSTOM_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('something broke');
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.name).toBe('PincodeIndiaLocationError');
  });

  test('PermissionDeniedError has correct defaults', () => {
    const err = new PermissionDeniedError();
    expect(err).toBeInstanceOf(PincodeIndiaLocationError);
    expect(err).toBeInstanceOf(PermissionDeniedError);
    expect(err.code).toBe('PERMISSION_DENIED');
    expect(err.message).toMatch(/denied/i);
  });

  test('LocationDisabledError has correct defaults', () => {
    const err = new LocationDisabledError();
    expect(err).toBeInstanceOf(PincodeIndiaLocationError);
    expect(err.code).toBe('LOCATION_DISABLED');
    expect(err.message).toMatch(/disabled/i);
  });

  test('LocationUnavailableError has correct defaults', () => {
    const err = new LocationUnavailableError();
    expect(err).toBeInstanceOf(PincodeIndiaLocationError);
    expect(err.code).toBe('LOCATION_UNAVAILABLE');
  });

  test('GeocoderError has correct defaults', () => {
    const err = new GeocoderError();
    expect(err).toBeInstanceOf(PincodeIndiaLocationError);
    expect(err.code).toBe('GEOCODER_ERROR');
  });

  test('TimeoutError has correct defaults', () => {
    const err = new TimeoutError();
    expect(err).toBeInstanceOf(PincodeIndiaLocationError);
    expect(err.code).toBe('TIMEOUT');
  });

  test('UnsupportedPlatformError default message matches spec exactly', () => {
    const err = new UnsupportedPlatformError();
    expect(err.message).toBe('Location APIs are not supported in Node.js');
    expect(err.code).toBe('UNSUPPORTED_PLATFORM');
  });

  test('all error classes accept custom messages', () => {
    expect(new PermissionDeniedError('custom').message).toBe('custom');
    expect(new LocationDisabledError('custom').message).toBe('custom');
    expect(new LocationUnavailableError('custom').message).toBe('custom');
    expect(new GeocoderError('custom').message).toBe('custom');
    expect(new TimeoutError('custom').message).toBe('custom');
    expect(new UnsupportedPlatformError('custom').message).toBe('custom');
  });

  test('errors are distinguishable via instanceof', () => {
    const err: Error = new GeocoderError();
    expect(err instanceof GeocoderError).toBe(true);
    expect(err instanceof PermissionDeniedError).toBe(false);
    expect(err instanceof TimeoutError).toBe(false);
  });
});
