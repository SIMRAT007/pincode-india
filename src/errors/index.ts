/**
 * Custom error types for pincode-india location APIs.
 *
 * All location-related rejections use one of these classes so consumers
 * can use `instanceof` checks instead of parsing error message strings.
 */

/** Base class for all pincode-india location errors. */
export class PincodeIndiaLocationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PincodeIndiaLocationError';
    this.code = code;
    // Maintain proper prototype chain when targeting ES5
    Object.setPrototypeOf(this, PincodeIndiaLocationError.prototype);
  }
}

/** Thrown when the user denies location permission. */
export class PermissionDeniedError extends PincodeIndiaLocationError {
  constructor(message = 'Location permission was denied by the user.') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionDeniedError';
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/** Thrown when device location services (GPS) are turned off. */
export class LocationDisabledError extends PincodeIndiaLocationError {
  constructor(message = 'Location services are disabled on this device.') {
    super(message, 'LOCATION_DISABLED');
    this.name = 'LocationDisabledError';
    Object.setPrototypeOf(this, LocationDisabledError.prototype);
  }
}

/** Thrown when a location fix could not be obtained (timeout, no signal, etc). */
export class LocationUnavailableError extends PincodeIndiaLocationError {
  constructor(message = 'Current location could not be determined.') {
    super(message, 'LOCATION_UNAVAILABLE');
    this.name = 'LocationUnavailableError';
    Object.setPrototypeOf(this, LocationUnavailableError.prototype);
  }
}

/** Thrown when native reverse-geocoding (Geocoder / CLGeocoder) fails. */
export class GeocoderError extends PincodeIndiaLocationError {
  constructor(message = 'Reverse geocoding failed for the given coordinates.') {
    super(message, 'GEOCODER_ERROR');
    this.name = 'GeocoderError';
    Object.setPrototypeOf(this, GeocoderError.prototype);
  }
}

/** Thrown when a location request exceeds its timeout window. */
export class TimeoutError extends PincodeIndiaLocationError {
  constructor(message = 'Location request timed out.') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/** Thrown when a location API is called on a platform that doesn't support it (e.g. Node.js). */
export class UnsupportedPlatformError extends PincodeIndiaLocationError {
  constructor(message = 'Location APIs are not supported in Node.js') {
    super(message, 'UNSUPPORTED_PLATFORM');
    this.name = 'UnsupportedPlatformError';
    Object.setPrototypeOf(this, UnsupportedPlatformError.prototype);
  }
}
