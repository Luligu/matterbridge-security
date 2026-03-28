import {
  bridgedNode,
  contactSensor,
  doorLockDevice,
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  onOffMountedSwitch,
  onOffOutlet,
  PlatformConfig,
  PlatformMatterbridge,
} from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
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

export const triggers = [TRIGGER_AWAY, TRIGGER_HOME, TRIGGER_NIGHT, TRIGGER_24H];

export const alerts = [ALERT_AWAY, ALERT_HOME, ALERT_NIGHT, ALERT_24H, ALERT_MASTER];

export const shortTimeout = 500;

export type Modes = typeof MODE_AWAY | typeof MODE_HOME | typeof MODE_NIGHT | typeof MODE_VACATION | typeof MODE_OFF;

export type SecurityPlatformConfig = PlatformConfig & {
  securityRoom: string;
  alertTimeout: number;
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
  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: SecurityPlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.7.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.7.0". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.log.info('Finished initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Make sure the platform is ready before registering devices
    await this.ready;

    // Create devices for modes
    for (const mode of modes) {
      const doorLock = new MatterbridgeEndpoint([doorLockDevice, bridgedNode], { id: `${this.getId(mode)}` })
        .createDefaultBridgedDeviceBasicInformationClusterServer(this.getName(mode), this.getSerial(mode), undefined, 'Matterbridge', 'Matterbridge Security Plugin')
        .createDefaultDoorLockClusterServer()
        .addRequiredClusterServers()
        .addCommandHandler('DoorLock.lockDoor', async () => {
          this.log.info(`Received lockDoor command for mode: ${mode}`);
          await this.context?.set('LastSecurityMode', mode);
          await this.syncronizeModes(mode);
        })
        .addCommandHandler('DoorLock.unlockDoor', async () => {
          this.log.info(`Received unlockDoor command for mode: ${mode}`);
          setTimeout(async () => {
            await this.setModeOff();
          }, shortTimeout).unref();
        })
        .addCommandHandler('DoorLock.unlockWithTimeout', async () => {
          this.log.info(`Received getLockState command for mode: ${mode}`);
        });
      await this.registerDevice(doorLock);
      await doorLock.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Unlocked, this.log);
    }
    const lastSecurityMode: Modes = (await this.context?.get('LastSecurityMode', MODE_OFF)) ?? MODE_OFF;
    this.log.notice(`Last security mode: ${lastSecurityMode}`);
    await this.getDeviceById(this.getId(lastSecurityMode))?.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Locked, this.log);
    await this.syncronizeModes(lastSecurityMode);

    // Create devices for triggers
    for (const trigger of triggers) {
      const triggerDevice = new MatterbridgeEndpoint([onOffMountedSwitch, onOffOutlet, bridgedNode], { id: `${this.getId(trigger)}` })
        .createDefaultBridgedDeviceBasicInformationClusterServer(this.getName(trigger), this.getSerial(trigger), undefined, 'Matterbridge', 'Matterbridge Security Plugin')
        .addRequiredClusterServers()
        .addCommandHandler('OnOff.on', async () => {
          this.log.info(`Received on command for trigger: ${trigger}`);
          // Restore the trigger state after a short timeout
          setTimeout(async () => {
            await triggerDevice.setAttribute(OnOff.Complete, 'onOff', false);
          }, shortTimeout).unref();
          // Trigger the alert device associated with the trigger and reset the trigger after the alert timeout
          await this.getDeviceById(this.getId(ALERT_MASTER))?.setAttribute(BooleanState.Complete, 'stateValue', false, this.log);
          await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.setAttribute(BooleanState.Complete, 'stateValue', false, this.log);
          if (this.config.alertTimeout > 0) {
            setTimeout(async () => {
              await this.getDeviceById(this.getId(ALERT_MASTER))?.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
              await this.getDeviceById(this.getId(trigger.replace('Trigger', 'Alert')))?.setAttribute(BooleanState.Complete, 'stateValue', true, this.log);
            }, this.config.alertTimeout).unref();
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

  async setModeOff(): Promise<void> {
    await this.getDeviceById(this.getId(MODE_OFF))?.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Locked, this.log);
    await this.syncronizeModes(MODE_OFF);
  }

  async syncronizeModes(mode: Modes): Promise<void> {
    this.log.info(`Synchronizing modes for mode ${mode}`);
    for (const m of modes) {
      const device = this.getDeviceById(this.getId(m));
      if (!device) continue;
      if (device.id === this.getId(mode)) continue;
      await device.setAttribute(DoorLock.Complete, 'lockState', DoorLock.LockState.Unlocked, this.log);
    }
  }
}
