import CoreLocation
import Foundation

/// Native iOS implementation of the pincode-india location APIs.
///
/// Responsibilities:
///  - Requesting "when in use" location authorization
///  - Checking whether location services are enabled system-wide
///  - Single-shot current location via `CLLocationManager`
///  - Continuous location updates ("watch") via the same manager
///  - Reverse geocoding via `CLGeocoder` (no paid mapping APIs)
///
/// Design notes:
///  - One `CLLocationManager` instance is reused for the module's lifetime.
///  - Pending promise callbacks for one-shot requests are stored in
///    `pendingLocationRequests` / `pendingPermissionRequest` and resolved
///    from the relevant `CLLocationManagerDelegate` callback, since
///    CoreLocation's API is delegate-based rather than completion-handler
///    based for authorization and continuous updates.
///  - Each active "watch" is tracked by an incrementing integer id to
///    mirror the Android module's contract and the JS-side expectations
///    in src/location/index.ts. Because `CLLocationManager` only supports
///    one active delegate stream at a time, multiple JS-level watches
///    share the same underlying CoreLocation updates stream; each
///    registered watch id receives every update via its own React Native
///    event so 1:1 JS-side dispatch is preserved.
@objc(PincodeIndia)
class PincodeIndia: RCTEventEmitter, CLLocationManagerDelegate {

  private let locationManager = CLLocationManager()

  /// Resolvers/rejecters for an in-flight requestLocationPermission() call.
  private var pendingPermissionRequest: (resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)?

  /// Resolvers/rejecters for an in-flight getCurrentLocation() call.
  private var pendingLocationRequests: [(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)] = []

  /// Active watch ids and their requested options, used to replay updates
  /// to JS as `PincodeIndiaLocationUpdate` events carrying each watch id.
  private var activeWatchIds = Set<Int>()
  private var nextWatchId = 1
  private var isContinuousUpdatesActive = false

  override init() {
    super.init()
    locationManager.delegate = self
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["PincodeIndiaLocationUpdate"]
  }

  // MARK: - requestLocationPermission()

  @objc(requestLocationPermission:rejecter:)
  func requestLocationPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status = currentAuthorizationStatus()

    switch status {
    case .authorizedAlways, .authorizedWhenInUse:
      resolve(true)
      return
    case .denied, .restricted:
      resolve(false)
      return
    case .notDetermined:
      pendingPermissionRequest = (resolve, reject)
      locationManager.requestWhenInUseAuthorization()
    @unknown default:
      resolve(false)
    }
  }

  // MARK: - isLocationEnabled()

  @objc(isLocationEnabled:rejecter:)
  func isLocationEnabled(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // CLLocationManager.locationServicesEnabled() reflects the system-wide
    // toggle (Settings > Privacy > Location Services), independent of this
    // app's own authorization status.
    resolve(CLLocationManager.locationServicesEnabled())
  }

  // MARK: - getCurrentLocation()

  @objc(getCurrentLocation:resolver:rejecter:)
  func getCurrentLocation(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status = currentAuthorizationStatus()
    guard status == .authorizedAlways || status == .authorizedWhenInUse else {
      reject("PERMISSION_DENIED", "Location permission was denied by the user.", nil)
      return
    }

    guard CLLocationManager.locationServicesEnabled() else {
      reject("LOCATION_DISABLED", "Location services are disabled on this device.", nil)
      return
    }

    applyAccuracy(from: options)
    pendingLocationRequests.append((resolve, reject))
    locationManager.requestLocation()
  }

  // MARK: - reverseGeocode()

  @objc(reverseGeocode:longitude:resolver:rejecter:)
  func reverseGeocode(
    _ latitude: Double,
    longitude: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let location = CLLocation(latitude: latitude, longitude: longitude)
    let geocoder = CLGeocoder()

    // CLGeocoder — Apple's on-device/MapKit-backed reverse geocoder.
    // No Google/Mappls/HERE API key or billing involved.
    geocoder.reverseGeocodeLocation(location) { placemarks, error in
      if let error = error {
        reject("GEOCODER_ERROR", error.localizedDescription, error)
        return
      }

      guard let placemark = placemarks?.first else {
        reject(
          "GEOCODER_ERROR",
          "Reverse geocoding returned no results for the given coordinates.",
          nil
        )
        return
      }

      let result: [String: Any] = [
        "pincode": placemark.postalCode ?? "",
        "city": placemark.locality ?? placemark.subAdministrativeArea ?? "",
        "district": placemark.subAdministrativeArea ?? placemark.locality ?? "",
        "state": placemark.administrativeArea ?? "",
        "country": placemark.country ?? "",
        "latitude": latitude,
        "longitude": longitude,
      ]
      resolve(result)
    }
  }

  // MARK: - watchLocation() / stopWatchingLocation()

  @objc(startWatching:resolver:rejecter:)
  func startWatching(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status = currentAuthorizationStatus()
    guard status == .authorizedAlways || status == .authorizedWhenInUse else {
      reject("PERMISSION_DENIED", "Location permission was denied by the user.", nil)
      return
    }
    guard CLLocationManager.locationServicesEnabled() else {
      reject("LOCATION_DISABLED", "Location services are disabled on this device.", nil)
      return
    }

    applyAccuracy(from: options)
    if let distanceFilter = options["distanceFilter"] as? Double {
      locationManager.distanceFilter = distanceFilter
    } else {
      locationManager.distanceFilter = 10
    }

    let watchId = nextWatchId
    nextWatchId += 1
    activeWatchIds.insert(watchId)

    if !isContinuousUpdatesActive {
      locationManager.startUpdatingLocation()
      isContinuousUpdatesActive = true
    }

    resolve(watchId)
  }

  @objc(stopWatching:resolver:rejecter:)
  func stopWatching(
    _ watchId: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    activeWatchIds.remove(watchId.intValue)

    if activeWatchIds.isEmpty && isContinuousUpdatesActive {
      locationManager.stopUpdatingLocation()
      isContinuousUpdatesActive = false
    }

    resolve(nil)
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(
    _ manager: CLLocationManager,
    didChangeAuthorization status: CLAuthorizationStatus
  ) {
    guard let pending = pendingPermissionRequest else { return }
    pendingPermissionRequest = nil

    switch status {
    case .authorizedAlways, .authorizedWhenInUse:
      pending.resolve(true)
    case .denied, .restricted:
      pending.resolve(false)
    case .notDetermined:
      // Still undetermined after a callback fired — treat as not granted
      // rather than leaving the JS promise hanging indefinitely.
      pending.resolve(false)
    @unknown default:
      pending.resolve(false)
    }
  }

  func locationManager(
    _ manager: CLLocationManager,
    didUpdateLocations locations: [CLLocation]
  ) {
    guard let location = locations.last else { return }
    let payload = locationToDictionary(location)

    // Resolve any pending one-shot getCurrentLocation() requests.
    if !pendingLocationRequests.isEmpty {
      let requests = pendingLocationRequests
      pendingLocationRequests.removeAll()
      requests.forEach { $0.resolve(payload) }
    }

    // Emit to every active JS-side watch.
    for watchId in activeWatchIds {
      var withWatchId = payload
      withWatchId["watchId"] = watchId
      sendEvent(withName: "PincodeIndiaLocationUpdate", body: withWatchId)
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    let clError = error as? CLError

    if !pendingLocationRequests.isEmpty {
      let requests = pendingLocationRequests
      pendingLocationRequests.removeAll()

      let (code, message): (String, String) = {
        switch clError?.code {
        case .denied:
          return ("PERMISSION_DENIED", "Location permission was denied by the user.")
        case .locationUnknown:
          return ("LOCATION_UNAVAILABLE", "Current location could not be determined.")
        default:
          return ("LOCATION_UNAVAILABLE", error.localizedDescription)
        }
      }()

      requests.forEach { $0.reject(code, message, error) }
    }
  }

  // MARK: - Helpers

  private func currentAuthorizationStatus() -> CLAuthorizationStatus {
    if #available(iOS 14.0, *) {
      return locationManager.authorizationStatus
    } else {
      return CLLocationManager.authorizationStatus()
    }
  }

  private func applyAccuracy(from options: NSDictionary) {
    let accuracy = options["accuracy"] as? String
    switch accuracy {
    case "low":
      locationManager.desiredAccuracy = kCLLocationAccuracyReduced
    case "balanced":
      locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    default:
      locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }
  }

  private func locationToDictionary(_ location: CLLocation) -> [String: Any] {
    return [
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "accuracy": location.horizontalAccuracy,
      "altitude": location.verticalAccuracy >= 0 ? location.altitude : NSNull(),
      "speed": location.speed >= 0 ? location.speed : NSNull(),
      "heading": location.course >= 0 ? location.course : NSNull(),
      "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
    ]
  }
}
