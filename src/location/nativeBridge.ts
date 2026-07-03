import type { NativePincodeLocationModule } from './types';
import { LocationUnavailableError } from '../errors';

/**
 * Lazily resolves the native TurboModule / legacy NativeModule bridge.
 *
 * We require('react-native') only inside this function — never at the
 * top of a file — so that importing pincode-india in Node.js or a
 * bundler that never calls a location API never touches react-native
 * at all. This keeps Node/browser bundle size and startup cost at zero
 * for consumers who only use the offline lookup APIs.
 */
let _cachedModule: NativePincodeLocationModule | null | undefined;

export function getNativeModule(): NativePincodeLocationModule | null {
  if (_cachedModule !== undefined) return _cachedModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require('react-native');

    // New Architecture: TurboModuleRegistry first, fall back to legacy bridge.
    const TurboModuleRegistry = RN.TurboModuleRegistry;
    let nativeModule: NativePincodeLocationModule | null = null;

    if (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function') {
      nativeModule = TurboModuleRegistry.get('PincodeIndia') ?? null;
    }

    if (!nativeModule && RN.NativeModules) {
      nativeModule = RN.NativeModules.PincodeIndia ?? null;
    }

    _cachedModule = nativeModule;
    return _cachedModule;
  } catch {
    _cachedModule = null;
    return null;
  }
}

/** Throws a clear, actionable error when the native module isn't linked. */
export function requireNativeModule(): NativePincodeLocationModule {
  const mod = getNativeModule();
  if (!mod) {
    throw new LocationUnavailableError(
      'Native PincodeIndia module not found. Make sure the package is ' +
        'correctly autolinked (run `npx pod-install` on iOS) and that you ' +
        'have rebuilt the app after installing pincode-india@2.x.'
    );
  }
  return mod;
}

/** Test-only helper to reset the cached native module reference. */
export function __resetNativeModuleCache(): void {
  _cachedModule = undefined;
}
