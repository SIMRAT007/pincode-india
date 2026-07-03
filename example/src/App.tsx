/**
 * pincode-india v2.0.0 — Example App
 *
 * Demonstrates:
 *  - Requesting location permission
 *  - Reading current GPS coordinates
 *  - Resolving the current pincode via native reverse-geocoding,
 *    merged with the offline database
 *  - Plain offline lookup (no GPS/permission needed)
 *  - Search-by-city against the offline database
 *
 * This file is illustrative — wire it into your own App.tsx /
 * navigation stack as needed. It does not depend on any UI library
 * beyond core React Native components, so it can be copy-pasted into
 * a fresh `npx react-native init` project for a quick smoke test.
 */
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import PincodeIndia, {
  type CurrentPincodeResult,
  type LocationCoordinates,
  type PincodeResult,
  PermissionDeniedError,
  LocationDisabledError,
} from 'pincode-india';

export default function App(): React.JSX.Element {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [coords, setCoords] = useState<LocationCoordinates | null>(null);
  const [currentPincode, setCurrentPincode] = useState<CurrentPincodeResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [manualPincode, setManualPincode] = useState('');
  const [manualResult, setManualResult] = useState<PincodeResult | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PincodeResult[]>([]);

  // ─── 1. Request permission ───────────────────────────────────────────
  const handleRequestPermission = useCallback(async () => {
    setStatusMessage('');
    try {
      const granted = await PincodeIndia.requestLocationPermission();
      setPermissionGranted(granted);
      setStatusMessage(granted ? 'Permission granted.' : 'Permission denied.');
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        setPermissionGranted(false);
        setStatusMessage('Permission was explicitly denied.');
      } else {
        setStatusMessage(`Error: ${(err as Error).message}`);
      }
    }
  }, []);

  // ─── 2. Get current GPS coordinates ──────────────────────────────────
  const handleGetCurrentLocation = useCallback(async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const enabled = await PincodeIndia.isLocationEnabled();
      if (!enabled) {
        setStatusMessage('Location services are turned off. Please enable GPS.');
        return;
      }
      const location = await PincodeIndia.getCurrentLocation({ accuracy: 'high' });
      setCoords(location);
    } catch (err) {
      if (err instanceof LocationDisabledError) {
        setStatusMessage('Location services are disabled.');
      } else {
        setStatusMessage(`Error: ${(err as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── 3. Get current pincode (GPS + reverse geocode + offline merge) ──
  const handleGetCurrentPincode = useCallback(async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const result = await PincodeIndia.getCurrentPincode();
      setCurrentPincode(result);
    } catch (err) {
      setStatusMessage(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── 4. Offline lookup by typed pincode ──────────────────────────────
  const handleManualLookup = useCallback(() => {
    const result = PincodeIndia.lookup(manualPincode);
    setManualResult(result);
  }, [manualPincode]);

  // ─── 5. Search by city name ───────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const results = PincodeIndia.searchByCity(searchQuery);
    setSearchResults(results.slice(0, 10));
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>pincode-india v2 demo</Text>

        {/* Section 1: Permission */}
        <Section title="1. Request location permission">
          <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
          {permissionGranted !== null && (
            <Text style={styles.resultText}>
              Granted: {permissionGranted ? 'Yes' : 'No'}
            </Text>
          )}
        </Section>

        {/* Section 2: Current location */}
        <Section title="2. Get current GPS location">
          <TouchableOpacity style={styles.button} onPress={handleGetCurrentLocation}>
            <Text style={styles.buttonText}>Get Current Location</Text>
          </TouchableOpacity>
          {coords && (
            <Text style={styles.resultText}>
              Lat: {coords.latitude.toFixed(6)}{'\n'}
              Lng: {coords.longitude.toFixed(6)}{'\n'}
              Accuracy: {coords.accuracy.toFixed(1)}m
            </Text>
          )}
        </Section>

        {/* Section 3: Current pincode */}
        <Section title="3. Get current pincode (native geocode + offline merge)">
          <TouchableOpacity style={styles.button} onPress={handleGetCurrentPincode}>
            <Text style={styles.buttonText}>Get Current Pincode</Text>
          </TouchableOpacity>
          {currentPincode && (
            <Text style={styles.resultText}>
              Pincode: {currentPincode.pincode}{'\n'}
              City: {currentPincode.city}{'\n'}
              District: {currentPincode.district}{'\n'}
              State: {currentPincode.state}{'\n'}
              {currentPincode.offlineMatch && (
                <>
                  Delivery: {currentPincode.offlineMatch.deliveryStatus}{'\n'}
                  Post Offices: {currentPincode.offlineMatch.offices.length}
                </>
              )}
            </Text>
          )}
        </Section>

        {/* Section 4: Offline lookup */}
        <Section title="4. Offline pincode lookup (no GPS needed)">
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit pincode"
            keyboardType="numeric"
            maxLength={6}
            value={manualPincode}
            onChangeText={setManualPincode}
          />
          <TouchableOpacity style={styles.button} onPress={handleManualLookup}>
            <Text style={styles.buttonText}>Look Up</Text>
          </TouchableOpacity>
          {manualResult && (
            <Text style={styles.resultText}>
              {manualResult.city}, {manualResult.district}, {manualResult.state}
            </Text>
          )}
        </Section>

        {/* Section 5: Search by city */}
        <Section title="5. Search by city name">
          <TextInput
            style={styles.input}
            placeholder="e.g. Bandra, Koramangala"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.button} onPress={handleSearch}>
            <Text style={styles.buttonText}>Search</Text>
          </TouchableOpacity>
          {searchResults.map((r) => (
            <Text key={r.pincode} style={styles.resultText}>
              {r.pincode} — {r.city}, {r.state}
            </Text>
          ))}
        </Section>

        {loading && <ActivityIndicator size="large" style={styles.loader} />}
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  section: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  resultText: { marginTop: 8, fontSize: 13, color: '#333', lineHeight: 20 },
  status: { marginTop: 12, color: '#b91c1c', fontSize: 13 },
  loader: { marginTop: 12 },
});
