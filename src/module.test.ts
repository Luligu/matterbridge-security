const MATTER_PORT = 6000;
const NAME = 'Platform';
const MATTER_CREATE_ONLY = true;

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { jest } from '@jest/globals';
import { internalFor } from 'matterbridge';
import {
  addMatterbridgePlatform,
  createMatterbridgeEnvironment,
  destroyMatterbridgeEnvironment,
  log,
  loggerInfoSpy,
  matterbridge,
  setupTest,
  startMatterbridgeEnvironment,
  stopMatterbridgeEnvironment,
} from 'matterbridge/jestutils';
import { DoorLock, OnOff } from 'matterbridge/matter/clusters';
import { wait } from 'matterbridge/utils';

import initializePlugin, { MODE_NIGHT, MODE_OFF, MODE_VACATION, Modes, modes, Platform, SecurityPlatformConfig, setters, triggers } from './module.js';

setupTest(NAME);

describe('TestPlatform', () => {
  let platform: Platform;

  const config = JSON.parse(readFileSync(path.join('.', 'matterbridge-security.config.json'), 'utf-8')) as SecurityPlatformConfig;

  beforeAll(async () => {
    // Create Matterbridge environment
    await createMatterbridgeEnvironment();
    await startMatterbridgeEnvironment(MATTER_PORT, MATTER_CREATE_ONLY);
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Destroy Matterbridge environment
    await stopMatterbridgeEnvironment(MATTER_CREATE_ONLY);
    await destroyMatterbridgeEnvironment(undefined, undefined, !MATTER_CREATE_ONLY);

    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should return an instance of TestPlatform', async () => {
    platform = initializePlugin(matterbridge, log, config);
    addMatterbridgePlatform(platform);
    expect(platform).toBeInstanceOf(Platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Finished initializing platform:', config.name);
    await platform.onShutdown();
  });

  it('should throw error in load when version is not valid', () => {
    const savedVersion = matterbridge.matterbridgeVersion;
    matterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new Platform(matterbridge, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.7.2". Please update Matterbridge to the latest version in the frontend.',
    );
    matterbridge.matterbridgeVersion = savedVersion;
  });

  it('should initialize platform with config name', () => {
    platform = new Platform(matterbridge, log, config);
    addMatterbridgePlatform(platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Finished initializing platform:', config.name);
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    platform.shortTimeout = 10;
    platform.config.alertTimeout = 0.001;
    expect(loggerInfoSpy).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    for (const mode of modes) {
      const device = platform.getDeviceById(platform.getId(mode));
      expect(device).toBeDefined();
      if (!device) continue;
      const internal = await internalFor(device, DoorLock.Complete);
      expect(internal).toBeDefined();
      if (internal) internal.enableTimeout = false;
      await device?.invokeBehaviorCommand(DoorLock.Complete, 'lockDoor', {});
      await device?.invokeBehaviorCommand(DoorLock.Complete, 'unlockDoor', {});
      await device?.invokeBehaviorCommand(DoorLock.Complete, 'unlockWithTimeout', { timeout: 1 });
    }

    // Test setters
    for (const setter of setters) {
      const device = platform.getDeviceById(platform.getId(setter));
      expect(device).toBeDefined();
      await device?.invokeBehaviorCommand(OnOff.Complete, 'on');
      await wait(100);
    }

    // Test triggers
    for (const trigger of triggers) {
      platform.currentMode = trigger.replaceAll('Trigger', 'Mode') as Modes;
      const device = platform.getDeviceById(platform.getId(trigger));
      expect(device).toBeDefined();
      platform.currentMode = MODE_OFF;
      await device?.invokeBehaviorCommand(OnOff.Complete, 'on');
      await wait(100);
      platform.currentMode = MODE_VACATION;
      await device?.invokeBehaviorCommand(OnOff.Complete, 'on');
      await wait(100);
      platform.currentMode = MODE_NIGHT;
      await device?.invokeBehaviorCommand(OnOff.Complete, 'on');
      await wait(100);
    }
    platform.config.unregisterOnShutdown = true;
    await platform.onShutdown('Test reason');

    platform.shortTimeout = 500;
    platform.config.alertTimeout = 60;
    platform.config.unregisterOnShutdown = false;
  });

  it('should call onStart without reason', async () => {
    platform.config.useSwitch = true;
    await platform.onStart();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onStart called with reason:', 'none');
  });

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onConfigure called');
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });

  it('should call onShutdown without reason', async () => {
    platform.config.unregisterOnShutdown = true;
    await platform.onShutdown();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onShutdown called with reason:', 'none');
  });
});
