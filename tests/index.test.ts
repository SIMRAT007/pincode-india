import PincodeIndia, {
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
  clearCache,
} from '../src/index';

// Clear cache before each test to ensure clean state
beforeEach(() => {
  clearCache();
});

// ─── lookup() ────────────────────────────────────────────────────────────────

describe('lookup()', () => {
  test('returns result for valid Delhi pincode', () => {
    const result = lookup('110001');
    expect(result).not.toBeNull();
    expect(result?.pincode).toBe('110001');
    expect(result?.state).toBe('Delhi');
    expect(result?.district).toBe('New Delhi');
    expect(result?.city).toBe('New Delhi');
  });

  test('returns result for valid Mumbai pincode', () => {
    const result = lookup('400001');
    expect(result).not.toBeNull();
    expect(result?.state).toBe('Maharashtra');
    expect(result?.district).toBe('Mumbai');
  });

  test('returns result for valid Bangalore pincode', () => {
    const result = lookup('560001');
    expect(result).not.toBeNull();
    expect(result?.state).toBe('Karnataka');
  });

  test('returns null for invalid pincode', () => {
    expect(lookup('000000')).toBeNull();
    expect(lookup('999999')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(lookup('')).toBeNull();
  });

  test('returns null for non-numeric input', () => {
    expect(lookup('ABCDEF')).toBeNull();
    expect(lookup('11000A')).toBeNull();
  });

  test('returns null for wrong length', () => {
    expect(lookup('1100')).toBeNull();
    expect(lookup('1100011')).toBeNull();
  });

  test('trims whitespace from pincode', () => {
    const result = lookup('  110001  ');
    expect(result).not.toBeNull();
    expect(result?.pincode).toBe('110001');
  });

  test('result has required fields', () => {
    const result = lookup('110001');
    expect(result).toHaveProperty('pincode');
    expect(result).toHaveProperty('city');
    expect(result).toHaveProperty('district');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('stateName');
    expect(result).toHaveProperty('circle');
    expect(result).toHaveProperty('deliveryStatus');
    expect(result).toHaveProperty('offices');
    expect(Array.isArray(result?.offices)).toBe(true);
  });

  test('result offices array has correct structure', () => {
    const result = lookup('110001');
    const office = result?.offices[0];
    expect(office).toHaveProperty('name');
    expect(office).toHaveProperty('type');
    expect(office).toHaveProperty('delivery');
  });
});

// ─── lookupMany() ─────────────────────────────────────────────────────────────

describe('lookupMany()', () => {
  test('returns results for multiple valid pincodes', () => {
    const results = lookupMany(['110001', '400001', '560001']);
    expect(results['110001']).not.toBeNull();
    expect(results['400001']).not.toBeNull();
    expect(results['560001']).not.toBeNull();
  });

  test('returns null for invalid pincodes in batch', () => {
    const results = lookupMany(['110001', '000000', '999999']);
    expect(results['110001']).not.toBeNull();
    expect(results['000000']).toBeNull();
    expect(results['999999']).toBeNull();
  });

  test('returns empty object for empty array', () => {
    expect(lookupMany([])).toEqual({});
  });
});

// ─── isValid() ────────────────────────────────────────────────────────────────

describe('isValid()', () => {
  test('returns true for valid pincode', () => {
    expect(isValid('110001')).toBe(true);
    expect(isValid('400001')).toBe(true);
    expect(isValid('700001')).toBe(true);
  });

  test('returns false for invalid pincode', () => {
    expect(isValid('000000')).toBe(false);
    expect(isValid('123')).toBe(false);
    expect(isValid('')).toBe(false);
  });
});

// ─── isDeliverable() ─────────────────────────────────────────────────────────

describe('isDeliverable()', () => {
  test('returns true for delivery pincodes', () => {
    expect(isDeliverable('110001')).toBe(true);
  });

  test('returns false for invalid pincodes', () => {
    expect(isDeliverable('000000')).toBe(false);
  });
});

// ─── getState() / getDistrict() / getCity() ──────────────────────────────────

describe('getState()', () => {
  test('returns correct state', () => {
    expect(getState('110001')).toBe('Delhi');
    expect(getState('400001')).toBe('Maharashtra');
    expect(getState('600001')).toBe('Tamil Nadu');
    expect(getState('700001')).toBe('West Bengal');
  });

  test('returns null for invalid pincode', () => {
    expect(getState('000000')).toBeNull();
  });
});

describe('getDistrict()', () => {
  test('returns correct district', () => {
    expect(getDistrict('110001')).toBe('New Delhi');
    expect(getDistrict('400001')).toBe('Mumbai');
  });

  test('returns null for invalid pincode', () => {
    expect(getDistrict('000000')).toBeNull();
  });
});

describe('getCity()', () => {
  test('returns city name', () => {
    const city = getCity('110001');
    expect(city).toBe('New Delhi');
  });

  test('returns null for invalid pincode', () => {
    expect(getCity('000000')).toBeNull();
  });
});

// ─── getCoordinates() ─────────────────────────────────────────────────────────

describe('getCoordinates()', () => {
  test('returns lat/lng for valid pincode', () => {
    const coords = getCoordinates('110001');
    expect(coords).not.toBeNull();
    expect(coords?.lat).toBeCloseTo(28.62, 0);
    expect(coords?.lng).toBeCloseTo(77.20, 0);
  });

  test('returns null for invalid pincode', () => {
    expect(getCoordinates('000000')).toBeNull();
  });
});

// ─── getPostOffices() ─────────────────────────────────────────────────────────

describe('getPostOffices()', () => {
  test('returns array of post offices', () => {
    const offices = getPostOffices('110001');
    expect(Array.isArray(offices)).toBe(true);
    expect(offices.length).toBeGreaterThan(0);
  });

  test('returns empty array for invalid pincode', () => {
    expect(getPostOffices('000000')).toEqual([]);
  });
});

// ─── getByState() ────────────────────────────────────────────────────────────

describe('getByState()', () => {
  test('returns pincodes for Delhi', () => {
    const pincodes = getByState('Delhi');
    expect(pincodes.length).toBeGreaterThan(0);
    expect(pincodes).toContain('110001');
  });

  test('is case-insensitive', () => {
    const lower = getByState('delhi');
    const upper = getByState('DELHI');
    expect(lower).toEqual(upper);
  });

  test('returns empty array for unknown state', () => {
    expect(getByState('InvalidState')).toEqual([]);
  });

  test('supports deliveryOnly filter', () => {
    const all = getByState('Goa');
    const deliveryOnly = getByState('Goa', { deliveryOnly: true });
    expect(deliveryOnly.length).toBeLessThanOrEqual(all.length);
  });
});

// ─── getByDistrict() ─────────────────────────────────────────────────────────

describe('getByDistrict()', () => {
  test('returns pincodes for New Delhi district', () => {
    const pincodes = getByDistrict('Delhi', 'New Delhi');
    expect(pincodes.length).toBeGreaterThan(0);
    expect(pincodes).toContain('110001');
  });

  test('returns empty array for unknown district', () => {
    expect(getByDistrict('Delhi', 'NonExistentDistrict')).toEqual([]);
  });
});

// ─── searchByCity() ───────────────────────────────────────────────────────────

describe('searchByCity()', () => {
  test('finds results for "Bandra"', () => {
    const results = searchByCity('Bandra');
    expect(results.length).toBeGreaterThan(0);
  });

  test('finds results for "Karol Bagh"', () => {
    const results = searchByCity('Karol Bagh');
    expect(results.length).toBeGreaterThan(0);
  });

  test('returns empty for short query', () => {
    expect(searchByCity('a')).toEqual([]);
  });

  test('returns empty for no match', () => {
    expect(searchByCity('xyznonexistent')).toEqual([]);
  });
});

// ─── getAllStates() ───────────────────────────────────────────────────────────

describe('getAllStates()', () => {
  test('returns all 36 states/UTs', () => {
    const states = getAllStates();
    expect(states.length).toBeGreaterThanOrEqual(35);
  });

  test('contains major states', () => {
    const states = getAllStates();
    expect(states).toContain('Delhi');
    expect(states).toContain('Maharashtra');
    expect(states).toContain('Karnataka');
    expect(states).toContain('Tamil Nadu');
    expect(states).toContain('West Bengal');
  });

  test('is sorted alphabetically', () => {
    const states = getAllStates();
    const sorted = [...states].sort();
    expect(states).toEqual(sorted);
  });
});

// ─── getDistricts() ───────────────────────────────────────────────────────────

describe('getDistricts()', () => {
  test('returns districts for Maharashtra', () => {
    const districts = getDistricts('Maharashtra');
    expect(districts.length).toBeGreaterThan(20);
    expect(districts).toContain('Mumbai');
  });

  test('returns empty for invalid state', () => {
    expect(getDistricts('InvalidState')).toEqual([]);
  });
});

// ─── Default export ───────────────────────────────────────────────────────────

describe('default export', () => {
  test('default export has all functions', () => {
    expect(typeof PincodeIndia.lookup).toBe('function');
    expect(typeof PincodeIndia.lookupMany).toBe('function');
    expect(typeof PincodeIndia.isValid).toBe('function');
    expect(typeof PincodeIndia.isDeliverable).toBe('function');
    expect(typeof PincodeIndia.getState).toBe('function');
    expect(typeof PincodeIndia.getDistrict).toBe('function');
    expect(typeof PincodeIndia.getCity).toBe('function');
    expect(typeof PincodeIndia.getCoordinates).toBe('function');
    expect(typeof PincodeIndia.getPostOffices).toBe('function');
    expect(typeof PincodeIndia.getByState).toBe('function');
    expect(typeof PincodeIndia.getByDistrict).toBe('function');
    expect(typeof PincodeIndia.searchByCity).toBe('function');
    expect(typeof PincodeIndia.getAllStates).toBe('function');
    expect(typeof PincodeIndia.getDistricts).toBe('function');
    expect(typeof PincodeIndia.preload).toBe('function');
  });

  test('default export lookup works', () => {
    const result = PincodeIndia.lookup('110001');
    expect(result?.state).toBe('Delhi');
  });
});
