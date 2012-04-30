//
//  ICloudPlugin.h
//  Tweedie
//
//  Created by Tim Wilkinson on 4/25/12.
//  Copyright (c) 2012 __MyCompanyName__. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <PhoneGap/PGPlugin.h>

@interface ICloudPlugin : PGPlugin {
  
  NSString* callbackID;
  NSString* registeredCallbackID;
  
}

@property (nonatomic, copy) NSString* callbackID;
@property (nonatomic, copy) NSString* registeredCallbackID;

- (void) set:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void) get:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void) remove:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void) getKeyValues:(NSMutableArray*)arguments withDict:(NSMutableDictionary*)options;
- (void) onChange:(NSNotification*)notification;

@end
