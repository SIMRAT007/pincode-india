package com.pincodeindia

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers [PincodeIndiaModule] with React Native's module registry.
 *
 * Works under both the legacy bridge and the New Architecture (Bridgeless /
 * TurboModules): when TurboModules are enabled, the autolinking-generated
 * `PincodeIndiaPackageTurboModuleManagerDelegate` resolves this same module
 * by name ("PincodeIndia") via [getModule]; under the legacy bridge,
 * [createNativeModules] is used directly. No separate codegen spec is
 * required for this module since it exposes a small, stable Promise-based
 * surface that the JS layer in src/location/nativeBridge.ts already
 * resolves dynamically (TurboModuleRegistry first, NativeModules fallback).
 */
class PincodeIndiaPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(PincodeIndiaModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
