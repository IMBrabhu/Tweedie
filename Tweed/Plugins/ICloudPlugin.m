//
//  ICloudPlugin.m
//  Tweedie
//
//  Created by Tim Wilkinson on 4/25/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import "ICloudPlugin.h"

@implementation ICloudPlugin

@synthesize callbackID;
@synthesize registeredCallbackID;

- (void) set:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
  
  self.callbackID = [arguments pop];
  NSString* key = [arguments objectAtIndex:0];
  NSString* value = [arguments objectAtIndex:1];

  [[NSUbiquitousKeyValueStore defaultStore] setString:value forKey:key];
  
  PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];
  [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
}

- (void) get:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
  
  self.callbackID = [arguments pop];
  NSString* key = [arguments objectAtIndex:0];
  
  NSString* value = [[NSUbiquitousKeyValueStore defaultStore] stringForKey:key];
  
  PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsString:value];
  [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
}

- (void) remove:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
  
  self.callbackID = [arguments pop];
  NSString* key = [arguments objectAtIndex:0];
  
  [[NSUbiquitousKeyValueStore defaultStore] removeObjectForKey:key];
  
  PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK];
  [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];

}

- (void) getKeyValues:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
  
  self.callbackID = [arguments pop];
  
  NSDictionary* keyValues = [[NSUbiquitousKeyValueStore defaultStore] dictionaryRepresentation];
  
  PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsDictionary:keyValues];
  [self writeJavascript: [pluginResult toSuccessCallbackString:self.callbackID]];
}

- (void) registerCallback:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options {
  
  self.registeredCallbackID = [arguments pop];

  [[NSNotificationCenter defaultCenter] addObserver:self selector: @selector(onChange:) name: NSUbiquitousKeyValueStoreDidChangeExternallyNotification object:[NSUbiquitousKeyValueStore defaultStore]];
  [[NSUbiquitousKeyValueStore defaultStore] synchronize];
}

- (void) onChange:(NSNotification*)notification {
  NSDictionary* userInfo = [notification userInfo];
  NSNumber* reasonForChange = [userInfo objectForKey:NSUbiquitousKeyValueStoreChangeReasonKey];
  if (reasonForChange) {
    switch ([reasonForChange intValue]) {
      case NSUbiquitousKeyValueStoreInitialSyncChange:
      case NSUbiquitousKeyValueStoreServerChange:
        {
          NSArray* keys = [userInfo valueForKey:NSUbiquitousKeyValueStoreChangedKeysKey];
          PluginResult* pluginResult = [PluginResult resultWithStatus:PGCommandStatus_OK messageAsArray:keys];
          [pluginResult setKeepCallbackAsBool:TRUE];
          NSString* js = [pluginResult toSuccessCallbackString:self.registeredCallbackID];
          [self writeJavascript: js];
        }
        break;
        
      default:
        break;
    }
  }
}

@end
