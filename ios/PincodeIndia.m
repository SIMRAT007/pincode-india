//
//  PincodeIndia.m
//  pincode-india
//
//  Objective-C bridge file exposing the Swift `PincodeIndia` class
//  (PincodeIndia.swift) to React Native's bridge / TurboModule system.
//  RCT_EXTERN_MODULE and RCT_EXTERN_METHOD generate the Objective-C
//  selectors the bridge uses to invoke the Swift implementation; the
//  actual logic lives entirely in the .swift file.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(PincodeIndia, RCTEventEmitter)

RCT_EXTERN_METHOD(
  requestLocationPermission: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  isLocationEnabled: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getCurrentLocation: (NSDictionary *)options
  resolver: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  reverseGeocode: (double)latitude
  longitude: (double)longitude
  resolver: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  startWatching: (NSDictionary *)options
  resolver: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  stopWatching: (nonnull NSNumber *)watchId
  resolver: (RCTPromiseResolveBlock)resolve
  rejecter: (RCTPromiseRejectBlock)reject
)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
