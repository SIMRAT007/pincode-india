import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostOffice {
  name: string;
  type: 'HO' | 'SO' | 'PO' | 'BO' | string;
  delivery: boolean;
}

export interface PincodeResult {
  pincode: string;
  city: string;
  district: string;
  state: string;
  stateName: string;
  circle: string;
  region: string;
  officeType: string;
  deliveryStatus: 'Delivery' | 'Non-Delivery';
  lat: number | null;
  lng: number | null;
  offices: PostOffice[];
}

export interface LookupOptions {
  /** If true, only return pincodes where deliveryStatus is 'Delivery' */
  deliveryOnly?: boolean;
}

type PincodeMap = Record<string, PincodeResult>;
type StateDistrictMap = Record<string, Record<string, string[]>>;

// ─── Data Loader (singleton) ─────────────────────────────────────────────────

let _pincodeData: PincodeMap | null = null;
let _stateDistrictData: StateDistrictMap | null = null;

function loadPincodeData(): PincodeMap {
  if (_pincodeData) return _pincodeData;

  const filePath = path.join(__dirname, '..', 'data', 'pincodes.json.gz');
  const compressed = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(compressed);
  _pincodeData = JSON.parse(decompressed.toString('utf8')) as PincodeMap;
  return _pincodeData;
}

function loadStateDistrictData(): StateDistrictMap {
  if (_stateDistrictData) return _stateDistrictData;

  const filePath = path.join(__dirname, '..', 'data', 'states-districts.json.gz');
  const compressed = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(compressed);
  _stateDistrictData = JSON.parse(decompressed.toString('utf8')) as StateDistrictMap;
  return _stateDistrictData;
}

// ─── Core Lookup Functions ────────────────────────────────────────────────────

/**
 * Look up a single pincode.
 * Returns null if the pincode is not found.
 *
 * @example
 * const result = lookup('110001');
 * // { pincode: '110001', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', ... }
 */
export function lookup(pincode: string): PincodeResult | null {
  if (!pincode || typeof pincode !== 'string') return null;

  const normalized = pincode.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;

  const data = loadPincodeData();
  return data[normalized] ?? null;
}

/**
 * Look up multiple pincodes at once.
 * Returns a map of pincode → result (null if not found).
 *
 * @example
 * const results = lookupMany(['110001', '400001', '999999']);
 * // { '110001': { ... }, '400001': { ... }, '999999': null }
 */
export function lookupMany(
  pincodes: string[]
): Record<string, PincodeResult | null> {
  if (!Array.isArray(pincodes)) return {};

  const data = loadPincodeData();
  const result: Record<string, PincodeResult | null> = {};

  for (const pincode of pincodes) {
    const normalized = (pincode ?? '').trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) {
      result[pincode] = null;
      continue;
    }
    result[normalized] = data[normalized] ?? null;
  }

  return result;
}

/**
 * Check if a pincode exists and is valid.
 *
 * @example
 * isValid('110001') // true
 * isValid('000000') // false
 */
export function isValid(pincode: string): boolean {
  return lookup(pincode) !== null;
}

/**
 * Check if a pincode has delivery service.
 *
 * @example
 * isDeliverable('110001') // true
 */
export function isDeliverable(pincode: string): boolean {
  const result = lookup(pincode);
  return result?.deliveryStatus === 'Delivery';
}

/**
 * Get the state name for a pincode.
 *
 * @example
 * getState('110001') // 'Delhi'
 */
export function getState(pincode: string): string | null {
  return lookup(pincode)?.state ?? null;
}

/**
 * Get the district name for a pincode.
 *
 * @example
 * getDistrict('110001') // 'New Delhi'
 */
export function getDistrict(pincode: string): string | null {
  return lookup(pincode)?.district ?? null;
}

/**
 * Get the city name for a pincode.
 *
 * @example
 * getCity('110001') // 'New Delhi'
 */
export function getCity(pincode: string): string | null {
  return lookup(pincode)?.city ?? null;
}

// ─── Search / Filter Functions ────────────────────────────────────────────────

/**
 * Get all pincodes for a given state.
 *
 * @example
 * getByState('Delhi')
 * // ['110001', '110002', ...]
 */
export function getByState(
  stateName: string,
  options: LookupOptions = {}
): string[] {
  if (!stateName) return [];

  const stateData = loadStateDistrictData();
  const normalizedState = stateName.trim();

  // Case-insensitive match
  const matchedState = Object.keys(stateData).find(
    (s) => s.toLowerCase() === normalizedState.toLowerCase()
  );
  if (!matchedState) return [];

  const districts = stateData[matchedState];
  let pincodes: string[] = [];

  for (const districtPincodes of Object.values(districts)) {
    pincodes = pincodes.concat(districtPincodes);
  }

  if (options.deliveryOnly) {
    const data = loadPincodeData();
    pincodes = pincodes.filter(
      (p) => data[p]?.deliveryStatus === 'Delivery'
    );
  }

  return pincodes;
}

/**
 * Get all pincodes for a given district within a state.
 *
 * @example
 * getByDistrict('Delhi', 'New Delhi')
 * // ['110001', '110002', ...]
 */
export function getByDistrict(
  stateName: string,
  districtName: string,
  options: LookupOptions = {}
): string[] {
  if (!stateName || !districtName) return [];

  const stateData = loadStateDistrictData();

  const matchedState = Object.keys(stateData).find(
    (s) => s.toLowerCase() === stateName.trim().toLowerCase()
  );
  if (!matchedState) return [];

  const districts = stateData[matchedState];
  const matchedDistrict = Object.keys(districts).find(
    (d) => d.toLowerCase() === districtName.trim().toLowerCase()
  );
  if (!matchedDistrict) return [];

  let pincodes = districts[matchedDistrict];

  if (options.deliveryOnly) {
    const data = loadPincodeData();
    pincodes = pincodes.filter(
      (p) => data[p]?.deliveryStatus === 'Delivery'
    );
  }

  return pincodes;
}

/**
 * Search pincodes by a city or area name (partial match supported).
 *
 * @example
 * searchByCity('Bandra')
 * // [{ pincode: '400050', city: 'Bandra West', ... }]
 */
export function searchByCity(
  query: string,
  options: LookupOptions = {}
): PincodeResult[] {
  if (!query || query.trim().length < 2) return [];

  const data = loadPincodeData();
  const q = query.trim().toLowerCase();
  const results: PincodeResult[] = [];

  for (const entry of Object.values(data)) {
    if (
      entry.city.toLowerCase().includes(q) ||
      entry.district.toLowerCase().includes(q)
    ) {
      if (options.deliveryOnly && entry.deliveryStatus !== 'Delivery') continue;
      results.push(entry);
    }
  }

  // Sort: exact city matches first, then partial
  results.sort((a, b) => {
    const aExact = a.city.toLowerCase() === q ? 0 : 1;
    const bExact = b.city.toLowerCase() === q ? 0 : 1;
    return aExact - bExact || a.pincode.localeCompare(b.pincode);
  });

  return results;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Get a sorted list of all states.
 *
 * @example
 * getAllStates()
 * // ['Andaman And Nicobar Islands', 'Andhra Pradesh', ...]
 */
export function getAllStates(): string[] {
  const stateData = loadStateDistrictData();
  return Object.keys(stateData).sort();
}

/**
 * Get all districts for a given state.
 *
 * @example
 * getDistricts('Maharashtra')
 * // ['Ahmednagar', 'Akola', ...]
 */
export function getDistricts(stateName: string): string[] {
  if (!stateName) return [];

  const stateData = loadStateDistrictData();
  const matchedState = Object.keys(stateData).find(
    (s) => s.toLowerCase() === stateName.trim().toLowerCase()
  );
  if (!matchedState) return [];

  return Object.keys(stateData[matchedState]).sort();
}

/**
 * Get all post offices for a given pincode.
 *
 * @example
 * getPostOffices('110001')
 * // [{ name: 'New Delhi GPO', type: 'HO', delivery: true }, ...]
 */
export function getPostOffices(pincode: string): PostOffice[] {
  return lookup(pincode)?.offices ?? [];
}

/**
 * Get coordinates (lat/lng) for a pincode.
 *
 * @example
 * getCoordinates('110001')
 * // { lat: 28.626806, lng: 77.20663 }
 */
export function getCoordinates(
  pincode: string
): { lat: number; lng: number } | null {
  const result = lookup(pincode);
  if (!result || result.lat == null || result.lng == null) return null;
  return { lat: result.lat, lng: result.lng };
}

/**
 * Preload all data into memory. Useful for servers that need instant lookups.
 * Call this at app startup to avoid first-lookup latency.
 *
 * @example
 * // At app startup:
 * preload();
 */
export function preload(): void {
  loadPincodeData();
  loadStateDistrictData();
}

/**
 * Clear the in-memory cache. Useful for testing.
 */
export function clearCache(): void {
  _pincodeData = null;
  _stateDistrictData = null;
}

// ─── Default export (object style) ───────────────────────────────────────────

// ─── v2.0.0: Native current-location support ─────────────────────────────────
// Re-exported here so existing `import { lookup } from 'pincode-india'`
// consumers see no change, while new consumers can also pull in location
// APIs from the same package root. The location module is loaded eagerly
// (it's pure JS), but it never touches `react-native` or any native module
// until one of these functions is actually called — see src/location/nativeBridge.ts.

export {
  requestLocationPermission,
  isLocationEnabled,
  getCurrentLocation,
  getCurrentPincode,
  watchLocation,
  stopWatchingLocation,
} from './location';

export type {
  LocationCoordinates,
  CurrentPincodeResult,
  LocationOptions,
  WatchLocationOptions,
  LocationWatchId,
  LocationUpdateCallback,
  LocationErrorCallback,
} from './location/types';

export {
  PincodeIndiaLocationError,
  PermissionDeniedError,
  LocationDisabledError,
  LocationUnavailableError,
  GeocoderError,
  TimeoutError,
  UnsupportedPlatformError,
} from './errors';

import {
  requestLocationPermission as _requestLocationPermission,
  isLocationEnabled as _isLocationEnabled,
  getCurrentLocation as _getCurrentLocation,
  getCurrentPincode as _getCurrentPincode,
  watchLocation as _watchLocation,
  stopWatchingLocation as _stopWatchingLocation,
} from './location';

// ─── Default export (object style) ───────────────────────────────────────────

const PincodeIndia = {
  // v1.x — offline lookup (unchanged)
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
  getAllStates,
  getDistricts,
  preload,
  clearCache,
  // v2.0.0 — native current-location
  requestLocationPermission: _requestLocationPermission,
  isLocationEnabled: _isLocationEnabled,
  getCurrentLocation: _getCurrentLocation,
  getCurrentPincode: _getCurrentPincode,
  watchLocation: _watchLocation,
  stopWatchingLocation: _stopWatchingLocation,
};

export default PincodeIndia;
