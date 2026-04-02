/**
 * This file contains the behavior server classes of Matterbridge.
 *
 * @file matterbridgeBehaviorsServer.ts
 * @author Luca Liguori
 * @created 2024-11-07
 * @version 1.4.0
 * @license Apache-2.0
 *
 * Copyright 2024, 2025, 2026 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ClusterAttributeValues, MatterbridgeEndpoint, MatterbridgeServer } from 'matterbridge';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ClusterBehavior, ClusterInterface } from 'matterbridge/matter';
import { DoorLockServer } from 'matterbridge/matter/behaviors';
import { DoorLock } from 'matterbridge/matter/clusters';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ClusterTypeModifier } from 'matterbridge/matter/types';
import { Status, StatusResponseError } from 'matterbridge/matter/types';

/**
 * DoorLock server that forwards lock, user, and credential commands to the Matterbridge command handler.
 */
export class SecurityDoorLockServer extends DoorLockServer.enable({
  events: { doorLockAlarm: true, lockOperation: true, lockOperationError: true },
  commands: { lockDoor: true, unlockDoor: true, unlockWithTimeout: true },
}) {
  /**
   * Handles the LockDoor command.
   * It will set lockState to Locked.
   *
   * @param {DoorLock.LockDoorRequest} request - Lock-door request payload.
   */
  override async lockDoor(request: DoorLock.LockDoorRequest): Promise<void> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info(`Locking door (endpoint ${this.endpoint.maybeId}.${this.endpoint.maybeNumber})`);
    if (!this.state.actuatorEnabled) throw new StatusResponseError('The actuator is not enabled', Status.UnsupportedCommand);
    await device.commandHandler.executeHandler('DoorLock.lockDoor', {
      command: 'lockDoor',
      request,
      cluster: DoorLockServer.id,
      attributes: this.state as unknown as ClusterAttributeValues<(typeof DoorLock.Complete)['attributes']>,
      endpoint: this.endpoint as MatterbridgeEndpoint,
    });
    device.log.debug(`MatterbridgeDoorLockServer: lockDoor called`);
    await super.lockDoor(request);
  }

  /**
   * Handles the UnlockDoor command.
   * It will set lockState to Unlocked.
   *
   * @param {DoorLock.UnlockDoorRequest} request - Unlock-door request payload.
   */
  override async unlockDoor(request: DoorLock.UnlockDoorRequest): Promise<void> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info(`Unlocking door (endpoint ${this.endpoint.maybeId}.${this.endpoint.maybeNumber})`);
    if (!this.state.actuatorEnabled) throw new StatusResponseError('The actuator is not enabled', Status.UnsupportedCommand);
    await device.commandHandler.executeHandler('DoorLock.unlockDoor', {
      command: 'unlockDoor',
      request,
      cluster: DoorLockServer.id,
      attributes: this.state as unknown as ClusterAttributeValues<(typeof DoorLock.Complete)['attributes']>,
      endpoint: this.endpoint as MatterbridgeEndpoint,
    });
    device.log.debug(`MatterbridgeDoorLockServer: unlockDoor called`);
    await super.unlockDoor(request);
  }

  /**
   * Handles the UnlockWithTimeout command.
   * It will set lockState to Unlocked.
   * The implementation of relocking after the timeout expires is left to the device.
   *
   * @param {DoorLock.UnlockWithTimeoutRequest} request - Unlock-door request payload.
   */
  override async unlockWithTimeout(request: DoorLock.UnlockWithTimeoutRequest): Promise<void> {
    const device = this.endpoint.stateOf(MatterbridgeServer);
    device.log.info(`Unlocking door with timeout ${request.timeout} seconds (endpoint ${this.endpoint.maybeId}.${this.endpoint.maybeNumber})`);
    if (!this.state.actuatorEnabled) throw new StatusResponseError('The actuator is not enabled', Status.UnsupportedCommand);
    await device.commandHandler.executeHandler('DoorLock.unlockWithTimeout', {
      command: 'unlockWithTimeout',
      request,
      cluster: DoorLockServer.id,
      attributes: this.state as unknown as ClusterAttributeValues<(typeof DoorLock.Complete)['attributes']>,
      endpoint: this.endpoint as MatterbridgeEndpoint,
    });
    device.log.debug(`MatterbridgeDoorLockServer: unlockWithTimeout called`);
    this.state.lockState = DoorLock.LockState.Unlocked;
    // unlockWithTimeout is not implemented in the base DoorLockServer
    // await super.unlockWithTimeout(request);
  }
}

/**
 * Creates a door lock cluster server with feature User (USR), PinCredential (PIN), and CredentialOverTheAirAccess (COTA).
 *
 * The lock state is set to Locked by default, and the lock type is set to DeadBolt by default.
 *
 * @param {MatterbridgeEndpoint} endpoint - The MatterbridgeEndpoint to which the cluster server will be added.
 * @param {DoorLock.LockState} [lockState] - The initial state of the lock (default: Locked).
 * @param {DoorLock.LockType} [lockType] - The type of the lock (default: DeadBolt).
 * @returns {this} The current MatterbridgeEndpoint instance for chaining.
 *
 * @remarks
 * All operating modes NOT supported by a lock SHALL be set to one. The value of the OperatingMode enumeration defines the related bit to be set.
 *
 * @remarks
 * The Apple Home works with this.
 */
export function createUserPinDoorLockClusterServer(
  endpoint: MatterbridgeEndpoint,
  lockState: DoorLock.LockState = DoorLock.LockState.Locked,
  lockType: DoorLock.LockType = DoorLock.LockType.DeadBolt,
): MatterbridgeEndpoint {
  endpoint.behaviors.require(
    SecurityDoorLockServer.with(DoorLock.Feature.User, DoorLock.Feature.PinCredential, DoorLock.Feature.CredentialOverTheAirAccess).enable({
      events: { doorLockAlarm: true, lockOperation: true, lockOperationError: true },
      commands: { lockDoor: true, unlockDoor: true, unlockWithTimeout: true },
    }),
    {
      // Base attributes
      lockState,
      lockType,
      /** This attribute SHALL indicate if the lock is currently able to (Enabled) or not able to (Disabled) process remote Lock, Unlock, or Unlock with Timeout commands. */
      actuatorEnabled: true,
      /** This attribute SHALL indicate the current operating mode of the lock as defined in OperatingModeEnum */
      operatingMode: DoorLock.OperatingMode.Normal,
      /**
       * This attribute SHALL contain a bitmap with all operating bits of the OperatingMode attribute supported
       * by the lock. All operating modes NOT supported by a lock SHALL be set to one. The value of
       * the OperatingMode enumeration defines the related bit to be set.
       * OperatingModesBitmap.Normal and OperatingModesBitmap.noRemoteLockUnlock are mandatory and SHALL always be supported.
       * Default value 0xFFF6 (1111 1111 1111 0110) means:
       * - normal: false (bit 0)
       * - vacation: true (bit 1)
       * - privacy: true (bit 2)
       * - noRemoteLockUnlock: false (bit 3)
       * - passage: true (bit 4)
       * Special case of inverted bitmap: add also alwaysSet = 2047 (0000 0111 1111 1111) to have all bits set except the unsupported ones.
       * Specs: "Any bit that is not yet defined in OperatingModesBitmap SHALL be set to 1."
       */
      supportedOperatingModes: { normal: false, vacation: true, privacy: true, noRemoteLockUnlock: false, passage: true, alwaysSet: 2047 },
      autoRelockTime: 0, // 0=disabled
      // PinCredential feature attributes
      numberOfPinUsersSupported: 10,
      maxPinCodeLength: 10,
      minPinCodeLength: 4,
      // PinCredential or RfidCredential feature attributes
      wrongCodeEntryLimit: 5,
      userCodeTemporaryDisableTime: 60,
      // PinCredential and CredentialOverTheAirAccess features attributes
      requirePinForRemoteOperation: true,
      // User feature attributes
      numberOfTotalUsersSupported: 10,
      credentialRulesSupport: { single: true },
      numberOfCredentialsSupportedPerUser: 10,
    },
  );
  return endpoint;
}
