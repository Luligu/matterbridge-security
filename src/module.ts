import {
  bridgedNode,
  contactSensor,
  DeviceTypeDefinition,
  doorLockDevice,
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  onOffMountedSwitch,
  onOffOutlet,
  onOffSwitch,
  PlatformConfig,
  PlatformMatterbridge,
} from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { AtLeastOne } from 'matterbridge/matter';
import { BooleanState, DoorLock, OnOff } from 'matterbridge/matter/clusters';

export const MODE_AWAY = 'Mode Away';
export const MODE_HOME = 'Mode Home';
export const MODE_NIGHT = 'Mode Night';
export const MODE_VACATION = 'Mode Vacation';
export const MODE_OFF = 'Mode Off';

export const TRIGGER_AWAY = 'Trigger Away'; // Trigger from contact sensors and presence/volumetric sensors
export const TRIGGER_HOME = 'Trigger Home'; // Trigger from security sensors like gas smoke levels, water leak, etc.
export const TRIGGER_NIGHT = 'Trigger Night'; // Trigger from contact sensors
export const TRIGGER_24H = 'Trigger 24h'; // Trigger from contact sensors

export const ALERT_AWAY = 'Alert Away'; // Alert for away mode, can be used for notifications or automations
export const ALERT_HOME = 'Alert Home'; // Alert for home mode, can be used for notifications or automations
export const ALERT_NIGHT = 'Alert Night'; // Alert for night mode, can be used for notifications or automations
export const ALERT_24H = 'Alert 24h'; // Alert for 24h mode, can be used for notifications or automations
export const ALERT_MASTER = 'Alert Master'; // Alert for master mode, can be used for notifications or automations

export const modes: Modes[] = [MODE_AWAY, MODE_HOME, MODE_NIGHT, MODE_VACATION, MODE_OFF];

export const triggers: Triggers[] = [TRIGGER_AWAY, TRIGGER_HOME, TRIGGER_NIGHT, TRIGGER_24H];

export const alerts: Alerts[] = [ALERT_AWAY, ALERT_HOME, ALERT_NIGHT, ALERT_24H, ALERT_MASTER];

export type Modes = typeof MODE_AWAY | typeof MODE_HOME | typeof MODE_NIGHT | typeof MODE_VACATION | typeof MODE_OFF;

export type Triggers = typeof TRIGGER_AWAY | typeof TRIGGER_HOME | typeof TRIGGER_NIGHT | typeof TRIGGER_24H;

export type Alerts = typeof ALERT_AWAY | typeof ALERT_HOME | typeof ALERT_NIGHT | typeof ALERT_24H | typeof ALERT_MASTER;

export type SecurityPlatformConfig = PlatformConfig & {
  securityRoom: string;
  alertTimeout: number;
  useSwitch: boolean;
};

/**
 * This is the standard interface for Matterbridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 * @param {PlatformMatterbridge} matterbridge - An instance of MatterBridge. This is the main interface for interacting with the MatterBridge system.
 * @param {AnsiLogger} log - An instance of AnsiLogger. This is used for logging messages in a format that can be displayed with ANSI color codes.
 * @param {SecurityPlatformConfig} config - The platform configuration.
 * @returns {Platform} - An instance of the SecurityPlatform. This is the main interface for interacting with the Security system.
 */
export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: SecurityPlatformConfig): Platform {
  return new Platform(matterbridge, log, config);
}

export class Platform extends MatterbridgeDynamicPlatform {
  shortTimeout = 500;
  currentMode: Modes = MODE_OFF;

  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: SecurityPlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.7.2')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.7.2". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.log.info('Finished initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Make sure the platform is ready before registering devices
    await this.ready;
    const triggerDeviceTypes: AtLeastOne<DeviceTypeDefinition> = this.config.useSwitch ? [onOffSwitch, bridgedNode] : [onOffMountedSwitch, onOffOutlet, bridgedNode];

    // Create devices for modes
    for (const mode of modes) {
      const doorLock = new MatterbridgeEndpoint([doorLockDevice, bridgedNode], { id: `${this.getId(mode)}` })
        .createDefaultBridgedDeviceBasicInformationClusterServer(this.getName(mode), this.getSerial(mode), undefined, 'Matterbridge', 'Matterbridge Security Plugin')
        .createDefaultDoorLockClusterServer()
        .addRequiredClusterServers()
        .addCommandHandler('DoorLock.lockDoor', async ({ context }) => {
          this.log.info(`Received lockDoor command for mode: ${mode}`);
          await this.getDeviceById(this.getId(mode))?.triggerEvent(DoorLock.Complete, 'doorLockAlarm', { alarmCode: DoorLock.AlarmCode.DoorForcedOpen }, this.log);
          await this.getDeviceById(this.getId(mode))?.triggerEvent(
            DoorLock.Complete,
            'lockOperation',
            {
              lockOperationType: DoorLock.LockOperationType.Lock,
              operationSource: DoorLock.OperationSource.Remote,
              userIndex: null,
              fabricIndex: context?.fabric ?? null,
              sourceNode: null,
              credentials: null,
            },
            this.log,
          );
          await this.syncronizeModes(mode);
        })
        .addCommandHandler('DoorLock.unlockDoor', async ({ context }) => {
          this.log.info(`Received unlockDoor command for mode: ${mode}`);
          await this.getDeviceById(this.getId(mode))?.triggerEvent(DoorLock.Complete, 'doorLockAlarm', { alarmCode: DoorLock.AlarmCode.DoorForcedOpen }, this.log);
          await this.getDeviceById(this.getId(mode))?.triggerEvent(
            DoorLock.Complete,
            'lockOperation',
            {
              lockOperationType: DoorLock.LockOperationType.Unlock,
              operationSource: DoorLock.OperationSource.Remote,
              userIndex: null,
              fabricIndex: context?.fabric ?? null,
              sourceNode: null,
              credentials: null,
            },
            this.log,
          );
          setTimeout(async () => {
            this.log.debug(`Resetting mode to off after unlock command for mode: ${mode}`);
            await this.setModeOff();
          }, this.shortTimeout).unref();
        })
        .addCommandHandler('DoorLock.unlockWithTimeout', async () => {
          this.log.info(`Received unlockWithTimeout command for mode: ${mode}`);
        });
      await this.registerDevice(doorLock);
      await doorLock.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Unlocked, this.log);
    }
    const lastSecurityMode: Modes = (await this.context?.get('LastSecurityMode', MODE_OFF)) ?? MODE_OFF;
    this.currentMode = lastSecurityMode;
    this.log.notice(`Last security mode: ${lastSecurityMode}`);
    await this.getDeviceById(this.getId(lastSecurityMode))?.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Locked, this.log);
    await this.syncronizeModes(lastSecurityMode);

    // Create devices for triggers
    for (const trigger of triggers) {
      const triggerDevice = new MatterbridgeEndpoint(triggerDeviceTypes, { id: `${this.getId(trigger)}` })
        .createDefaultBridgedDeviceBasicInformationClusterServer(this.getName(trigger), this.getSerial(trigger), undefined, 'Matterbridge', 'Matterbridge Security Plugin')
        .addRequiredClusterServers()
        .addCommandHandler('OnOff.on', async () => {
          this.log.info(`Received on command for trigger: ${trigger}`);
          // Restore the trigger state after a short timeout
          setTimeout(async () => {
            this.log.debug(`Resetting trigger state to off after on command for trigger: ${trigger}`);
            await triggerDevice.setAttribute(OnOff.Complete, 'onOff', false);
          }, this.shortTimeout).unref();
          if (this.currentMode === MODE_OFF) return;
          if (trigger === TRIGGER_AWAY && this.currentMode !== MODE_AWAY && this.currentMode !== MODE_VACATION) return;
          else if (trigger === TRIGGER_HOME && this.currentMode !== MODE_HOME) return;
          else if (trigger === TRIGGER_NIGHT && this.currentMode !== MODE_NIGHT) return;
          else this.log.info(`Trigger ${trigger} activated for mode ${this.currentMode}, activating alerts...`);
          // Trigger the master alert and the alert device associated with the trigger and reset the trigger after the alert timeout
          await this.getDeviceById(this.getId(ALERT_MASTER))?.setAttribute(BooleanState.Complete, 'stateValue', false, this.log);
          await this.getDeviceById(this.getId(ALERT_MASTER))?.triggerEvent(BooleanState.Complete, 'stateChange', { stateValue: false }, this.log);
          await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.setAttribute(BooleanState.Complete, 'stateValue', false, this.log);
          await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.triggerEvent(BooleanState.Complete, 'stateChange', { stateValue: false }, this.log);
          if (this.config.alertTimeout > 0) {
            setTimeout(async () => {
              await this.getDeviceById(this.getId(ALERT_MASTER))?.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
              await this.getDeviceById(this.getId(ALERT_MASTER))?.triggerEvent(BooleanState.Complete, 'stateChange', { stateValue: true }, this.log);
              await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
              await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.triggerEvent(BooleanState.Complete, 'stateChange', { stateValue: true }, this.log);
            }, this.config.alertTimeout * 1000).unref();
          }
        });
      await this.registerDevice(triggerDevice);
      await triggerDevice.setAttribute(OnOff.Complete, 'onOff', false, this.log);
    }

    // Create devices for alerts
    for (const alert of alerts) {
      const alertDevice = new MatterbridgeEndpoint([contactSensor, bridgedNode], { id: `${this.getId(alert)}` })
        .createDefaultBridgedDeviceBasicInformationClusterServer(this.getName(alert), this.getSerial(alert), undefined, 'Matterbridge', 'Matterbridge Security Plugin')
        .addRequiredClusterServers();
      await this.registerDevice(alertDevice);
      await alertDevice.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('onConfigure called');
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }

  getName(name: string): string {
    return this.config.securityRoom + ' ' + name;
  }

  getId(name: string): string {
    return this.config.securityRoom + name.replaceAll(' ', '');
  }

  getSerial(name: string): string {
    return 'security-' + name.toLowerCase().replaceAll(' ', '-');
  }

  /**
   * Set the mode to off by unlocking all other modes.
   * It also updates the current mode and the last security mode so it can be restored on restart.
   */
  async setModeOff(): Promise<void> {
    this.currentMode = MODE_OFF;
    await this.context?.set('LastSecurityMode', MODE_OFF);
    await this.getDeviceById(this.getId(MODE_OFF))?.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Locked, this.log);
    await this.syncronizeModes(MODE_OFF);
    await this.resetAlerts();
  }

  /**
   * Syncronize the modes unlocking all other modes.
   * It also updates the current mode and the last security mode so it can be restored on restart.
   *
   * @param {Modes} mode - The current mode, all other modes will be unlocked.
   */
  async syncronizeModes(mode: Modes): Promise<void> {
    this.log.info(`Synchronizing modes for mode ${mode}`);
    this.currentMode = mode;
    await this.context?.set('LastSecurityMode', mode);
    if (mode === MODE_OFF) await this.resetAlerts();
    for (const m of modes) {
      const device = this.getDeviceById(this.getId(m));
      // istanbul ignore next - This is to prevent errors in case the device is not found, it should never happen but it's better to be safe than sorry
      if (!device) continue;
      if (device.id === this.getId(mode)) continue;
      await device.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Unlocked, this.log);
    }
  }

  /**
   * Reset all alerts by setting their stateValue to true and triggering a stateChange event.
   * This can be used to reset the alerts after they have been triggered if the alertTimeout is set to 0 or to a very high value.
   */
  async resetAlerts(): Promise<void> {
    for (const alert of alerts) {
      await this.getDeviceById(this.getId(alert))?.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
      await this.getDeviceById(this.getId(alert))?.triggerEvent(BooleanState.Complete, 'stateChange', { stateValue: true }, this.log);
    }
  }
}
