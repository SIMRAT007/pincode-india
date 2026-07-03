/**
 * @jest-environment jsdom
 */
import {
  hasBrowserGeolocation,
  getBrowserLocation,
  watchBrowserLocation,
  clearBrowserWatch,
} from '../../src/location/browserAdapter';
import {
  PermissionDeniedError,
  TimeoutError,
  LocationUnavailableError,
} from '../../src/errors';

const samplePosition: GeolocationPosition = {
  coords: {
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 12,
    altitude: 200,
    altitudeAccuracy: 5,
    speed: 0,
    heading: 0,
    toJSON() {
      return this;
    },
  },
  timestamp: 1700000000000,
  toJSON() {
    return this;
  },
};

function mockGeolocation(overrides: Partial<Geolocation> = {}) {
  const geolocation: Geolocation = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    ...overrides,
  } as unknown as Geolocation;

  Object.defineProperty(global.navigator, 'geolocation', {
    value: geolocation,
    configurable: true,
  });

  return geolocation;
}

function removeGeolocation() {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: undefined,
    configurable: true,
  });
}

describe('hasBrowserGeolocation()', () => {
  afterEach(() => removeGeolocation());

  test('returns true when navigator.geolocation.getCurrentPosition exists', () => {
    mockGeolocation();
    expect(hasBrowserGeolocation()).toBe(true);
  });

  test('returns false when navigator.geolocation is missing', () => {
    removeGeolocation();
    expect(hasBrowserGeolocation()).toBe(false);
  });
});

describe('getBrowserLocation()', () => {
  afterEach(() => removeGeolocation());

  test('resolves with mapped coordinates on success', async () => {
    mockGeolocation({
      getCurrentPosition: jest.fn((success) => success(samplePosition)),
    });

    const result = await getBrowserLocation();
    expect(result.latitude).toBe(28.6139);
    expect(result.longitude).toBe(77.209);
    expect(result.accuracy).toBe(12);
    expect(result.timestamp).toBe(1700000000000);
  });

  test('rejects with PermissionDeniedError on PERMISSION_DENIED', async () => {
    mockGeolocation({
      getCurrentPosition: jest.fn((_success, error) =>
        error!({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any)
      ),
    });

    await expect(getBrowserLocation()).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  test('rejects with TimeoutError on TIMEOUT', async () => {
    mockGeolocation({
      getCurrentPosition: jest.fn((_success, error) =>
        error!({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any)
      ),
    });

    await expect(getBrowserLocation()).rejects.toBeInstanceOf(TimeoutError);
  });

  test('rejects with LocationUnavailableError on POSITION_UNAVAILABLE', async () => {
    mockGeolocation({
      getCurrentPosition: jest.fn((_success, error) =>
        error!({ code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any)
      ),
    });

    await expect(getBrowserLocation()).rejects.toBeInstanceOf(LocationUnavailableError);
  });

  test('rejects with LocationUnavailableError when geolocation API is absent', async () => {
    removeGeolocation();
    await expect(getBrowserLocation()).rejects.toBeInstanceOf(LocationUnavailableError);
  });
});

describe('watchBrowserLocation()', () => {
  afterEach(() => removeGeolocation());

  test('calls onUpdate with mapped coordinates', () => {
    const geo = mockGeolocation({
      watchPosition: jest.fn((success) => {
        success(samplePosition);
        return 42;
      }),
    });

    const onUpdate = jest.fn();
    const onError = jest.fn();
    const watchId = watchBrowserLocation(onUpdate, onError);

    expect(watchId).toBe(42);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 28.6139, longitude: 77.209 })
    );
    expect(geo.watchPosition).toHaveBeenCalled();
  });

  test('calls onError and returns -1 when geolocation API is absent', () => {
    removeGeolocation();
    const onUpdate = jest.fn();
    const onError = jest.fn();

    const watchId = watchBrowserLocation(onUpdate, onError);

    expect(watchId).toBe(-1);
    expect(onError).toHaveBeenCalledWith(expect.any(LocationUnavailableError));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('clearBrowserWatch()', () => {
  afterEach(() => removeGeolocation());

  test('calls navigator.geolocation.clearWatch with the given id', () => {
    const geo = mockGeolocation();
    clearBrowserWatch(7);
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  test('does nothing for a negative watch id', () => {
    const geo = mockGeolocation();
    clearBrowserWatch(-1);
    expect(geo.clearWatch).not.toHaveBeenCalled();
  });

  test('does nothing when geolocation API is absent', () => {
    removeGeolocation();
    expect(() => clearBrowserWatch(1)).not.toThrow();
  });
});
