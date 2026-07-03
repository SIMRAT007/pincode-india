package com.pincodeindia

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * Native Android implementation of the pincode-india location APIs.
 *
 * Responsibilities:
 *  - Runtime permission requests (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION)
 *  - Checking whether device location services (GPS/network) are enabled
 *  - Single-shot current location via [FusedLocationProviderClient]
 *  - Continuous location updates ("watch") via the same client
 *  - Reverse geocoding via the stock [Geocoder] (no paid mapping APIs)
 *
 * Design notes:
 *  - All Play Services [Task] results are bridged to coroutines so the
 *    React Native [Promise] surface stays simple and linear to read.
 *  - The module holds no long-lived references to the host [Activity];
 *    it always re-resolves `currentActivity` per call to avoid leaking
 *    a stale/destroyed Activity across configuration changes.
 *  - Each active watch is tracked in [activeWatches] keyed by an
 *    incrementing integer id handed back to JS, mirroring the contract
 *    expected by the TypeScript layer in src/location/index.ts.
 */
class PincodeIndiaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(reactApplicationContext)
    }

    /** Registry of active continuous-location watches, keyed by the id returned to JS. */
    private val activeWatches = ConcurrentHashMap<Int, LocationCallback>()
    private var nextWatchId = 1

    override fun getName(): String = "PincodeIndia"

    // ─── Permission handling ──────────────────────────────────────────────

    private fun hasLocationPermission(): Boolean {
        val context: Context = reactApplicationContext
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    /**
     * Requests ACCESS_FINE_LOCATION (and ACCESS_COARSE_LOCATION as a paired
     * fallback) at runtime. Resolves `true` if either permission ends up
     * granted, `false` otherwise. Requires the host Activity to implement
     * [PermissionAwareActivity], which React Native's default Activity does.
     */
    @ReactMethod
    fun requestLocationPermission(promise: Promise) {
        if (hasLocationPermission()) {
            promise.resolve(true)
            return
        }

        val activity = currentActivity
        if (activity == null) {
            promise.reject(
                "NO_ACTIVITY",
                "Cannot request location permission: no current Activity attached."
            )
            return
        }

        if (activity !is PermissionAwareActivity) {
            promise.reject(
                "PERMISSION_AWARE_REQUIRED",
                "Host Activity must implement PermissionAwareActivity to request " +
                    "runtime permissions. This is the default for React Native apps."
            )
            return
        }

        val requestCode = LOCATION_PERMISSION_REQUEST_CODE
        val listener = PermissionListener { code, permissions, grantResults ->
            if (code != requestCode) return@PermissionListener false

            val granted = grantResults.isNotEmpty() &&
                grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            promise.resolve(granted)
            true
        }

        activity.requestPermissions(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ),
            requestCode,
            listener
        )
    }

    // ─── Location services enabled check ──────────────────────────────────

    /**
     * Checks whether GPS or network-based location providers are currently
     * enabled on the device. This is independent of app permission state.
     */
    @ReactMethod
    fun isLocationEnabled(promise: Promise) {
        try {
            val locationManager =
                reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val networkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            promise.resolve(gpsEnabled || networkEnabled)
        } catch (e: Exception) {
            promise.reject("LOCATION_ENABLED_CHECK_FAILED", e.message, e)
        }
    }

    // ─── getCurrentLocation() ──────────────────────────────────────────────

    @ReactMethod
    fun getCurrentLocation(options: ReadableMap, promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject(
                "PERMISSION_DENIED",
                "Location permission was denied by the user."
            )
            return
        }

        if (!isAnyProviderEnabled()) {
            promise.reject(
                "LOCATION_DISABLED",
                "Location services are disabled on this device."
            )
            return
        }

        val priority = priorityFromAccuracy(
            if (options.hasKey("accuracy")) options.getString("accuracy") else null
        )

        moduleScope.launch {
            try {
                val location = fetchCurrentLocation(priority)
                if (location == null) {
                    promise.reject(
                        "LOCATION_UNAVAILABLE",
                        "Current location could not be determined."
                    )
                } else {
                    promise.resolve(location.toWritableMap())
                }
            } catch (e: SecurityException) {
                promise.reject("PERMISSION_DENIED", e.message, e)
            } catch (e: Exception) {
                promise.reject("LOCATION_UNAVAILABLE", e.message, e)
            }
        }
    }

    @Suppress("MissingPermission") // Permission verified by hasLocationPermission() above.
    private suspend fun fetchCurrentLocation(priority: Int): Location? {
        val cancellationSource = CancellationTokenSource()
        return try {
            fusedLocationClient
                .getCurrentLocation(priority, cancellationSource.token)
                .await()
        } catch (e: Exception) {
            // Fall back to the last known location if a fresh fix fails —
            // better to return a slightly stale fix than nothing at all.
            fusedLocationClient.lastLocation.await()
        }
    }

    // ─── reverseGeocode() ──────────────────────────────────────────────────

    /**
     * Reverse-geocodes a lat/lng pair into city/district/state/country/pincode
     * using the stock Android [Geocoder] — backed by an on-device or Google
     * geocoding service depending on OS version, but requiring no API key
     * and incurring no separate billing, unlike the Maps Platform APIs.
     */
    @ReactMethod
    fun reverseGeocode(latitude: Double, longitude: Double, promise: Promise) {
        moduleScope.launch {
            try {
                val address = withContext(Dispatchers.IO) {
                    geocodeSync(latitude, longitude)
                }

                if (address == null) {
                    promise.reject(
                        "GEOCODER_ERROR",
                        "Reverse geocoding returned no results for the given coordinates."
                    )
                    return@launch
                }

                val result = Arguments.createMap().apply {
                    putString("pincode", address.postalCode ?: "")
                    putString("city", address.locality ?: address.subAdminArea ?: "")
                    putString("district", address.subAdminArea ?: address.locality ?: "")
                    putString("state", address.adminArea ?: "")
                    putString("country", address.countryName ?: "")
                    putDouble("latitude", latitude)
                    putDouble("longitude", longitude)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("GEOCODER_ERROR", e.message, e)
            }
        }
    }

    /**
     * Synchronous Geocoder call, dispatched to an IO thread by the caller.
     * Supports both the modern (API 33+) async-callback Geocoder and the
     * legacy synchronous API on older OS versions.
     */
    private suspend fun geocodeSync(latitude: Double, longitude: Double): Address? {
        val geocoder = Geocoder(reactApplicationContext, Locale.getDefault())

        if (!Geocoder.isPresent()) return null

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            suspendCancellableCoroutine { continuation ->
                geocoder.getFromLocation(latitude, longitude, 1) { addresses ->
                    continuation.resume(addresses.firstOrNull(), null)
                }
            }
        } else {
            @Suppress("DEPRECATION")
            geocoder.getFromLocation(latitude, longitude, 1)?.firstOrNull()
        }
    }

    // ─── watchLocation() / stopWatchingLocation() ──────────────────────────

    @ReactMethod
    fun startWatching(options: ReadableMap, promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission was denied by the user.")
            return
        }
        if (!isAnyProviderEnabled()) {
            promise.reject("LOCATION_DISABLED", "Location services are disabled on this device.")
            return
        }

        val priority = priorityFromAccuracy(
            if (options.hasKey("accuracy")) options.getString("accuracy") else null
        )
        val interval = if (options.hasKey("interval")) options.getInt("interval").toLong() else 5000L
        val distanceFilter = if (options.hasKey("distanceFilter")) {
            options.getDouble("distanceFilter").toFloat()
        } else {
            10f
        }

        val watchId = synchronized(this) { nextWatchId++ }

        val request = LocationRequest.Builder(priority, interval)
            .setMinUpdateDistanceMeters(distanceFilter)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                sendLocationUpdateEvent(watchId, location)
            }
        }

        try {
            @Suppress("MissingPermission")
            fusedLocationClient.requestLocationUpdates(
                request,
                callback,
                reactApplicationContext.mainLooper
            )
            activeWatches[watchId] = callback
            promise.resolve(watchId)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", e.message, e)
        } catch (e: Exception) {
            promise.reject("LOCATION_UNAVAILABLE", e.message, e)
        }
    }

    @ReactMethod
    fun stopWatching(watchId: Int, promise: Promise) {
        val callback = activeWatches.remove(watchId)
        if (callback != null) {
            fusedLocationClient.removeLocationUpdates(callback)
        }
        promise.resolve(null)
    }

    /**
     * Emits a `PincodeIndiaLocationUpdate` event to JS carrying the watch id
     * and the new coordinate fix. The JS-side watchLocation() wrapper in
     * src/location/index.ts is responsible for routing this to the correct
     * caller's onUpdate callback.
     */
    private fun sendLocationUpdateEvent(watchId: Int, location: Location) {
        val payload = location.toWritableMap().apply {
            putInt("watchId", watchId)
        }
        reactApplicationContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("PincodeIndiaLocationUpdate", payload)
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private fun isAnyProviderEnabled(): Boolean {
        val locationManager =
            reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }

    private fun priorityFromAccuracy(accuracy: String?): Int = when (accuracy) {
        "low" -> Priority.PRIORITY_PASSIVE
        "balanced" -> Priority.PRIORITY_BALANCED_POWER_ACCURACY
        else -> Priority.PRIORITY_HIGH_ACCURACY
    }

    private fun Location.toWritableMap(): WritableMap = Arguments.createMap().apply {
        putDouble("latitude", latitude)
        putDouble("longitude", longitude)
        putDouble("accuracy", accuracy.toDouble())
        if (hasAltitude()) putDouble("altitude", altitude) else putNull("altitude")
        if (hasSpeed()) putDouble("speed", speed.toDouble()) else putNull("speed")
        if (hasBearing()) putDouble("heading", bearing.toDouble()) else putNull("heading")
        putDouble("timestamp", time.toDouble())
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        moduleScope.cancel()
        activeWatches.values.forEach { fusedLocationClient.removeLocationUpdates(it) }
        activeWatches.clear()
    }

    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 9821
    }
}
