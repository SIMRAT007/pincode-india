/**
 * Lightweight runtime platform detection.
 *
 * Deliberately avoids importing `react-native` at module-evaluation time —
 * doing so would throw in plain Node.js. We detect the runtime first, and
 * only `require('react-native')` lazily, inside locationBridge.ts, when a
 * location API is actually invoked on a React Native target.
 */

export type Runtime = 'node' | 'react-native' | 'browser' | 'unknown';

/**
 * Detects whether code is running under React Native without importing
 * the `react-native` package. RN's JS environment defines a global
 * `navigator.product === 'ReactNative'` marker for exactly this purpose.
 */
function isReactNative(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  );
}

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    !isReactNative()
  );
}

function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null &&
    !isReactNative()
  );
}

let _cachedRuntime: Runtime | null = null;

/** Returns the current JS runtime. Result is cached after first call. */
export function detectRuntime(): Runtime {
  if (_cachedRuntime) return _cachedRuntime;

  if (isReactNative()) {
    _cachedRuntime = 'react-native';
  } else if (isBrowser()) {
    _cachedRuntime = 'browser';
  } else if (isNode()) {
    _cachedRuntime = 'node';
  } else {
    _cachedRuntime = 'unknown';
  }

  return _cachedRuntime;
}

/** Test-only helper to reset the cached runtime detection. */
export function __resetRuntimeCache(): void {
  _cachedRuntime = null;
}
