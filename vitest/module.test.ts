const MATTER_PORT = 6000;
const NAME = 'Platform';
const MATTER_CREATE_ONLY = true;

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { internalFor, type PlatformMatterbridge } from 'matterbridge';
import { DoorLock, OnOff } from 'matterbridge/matter/clusters';
import { wait } from 'matterbridge/utils';
import { log, loggerInfoSpy, setupTest } from 'matterbridge/vitest-utils';
import {
  addMatterbridge,
  createServerNode,
  createTestEnvironment,
  destroyTestEnvironment,
  flushServerNode,
  getMatterbridge,
  startServerNode,
  stopServerNode,
} from 'matterbridge/vitest-utils/matter';

import initializePlugin, { MODE_NIGHT, MODE_OFF, MODE_VACATION, type Modes, modes, Platform, type SecurityPlatformConfig, setters, triggers } from '../src/module.js';

// Setup the test environment
await setupTest(NAME, false);

describe('TestPlatform', () => {
  let matterbridge: PlatformMatterbridge;
  let platform: Platform;

  const config = JSON.parse(readFileSync(path.join('.', 'matterbridge-security.config.json'), 'utf-8')) as SecurityPlatformConfig;

  beforeAll(async () => {
    // Create Matterbridge environment
    await createTestEnvironment();
    await createServerNode(MATTER_PORT);
    if (!MATTER_CREATE_ONLY) await startServerNode();
    matterbridge = getMatterbridge();
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Destroy Matterbridge environment
    if (MATTER_CREATE_ONLY) await flushServerNode();
    else await stopServerNode();
    await destroyTestEnvironment();

    // Restore all mocks
    vi.restoreAllMocks();
  });

  it('should return an instance of TestPlatform', async () => {
    platform = initializePlugin(matterbridge, log, config);
    addMatterbridge(platform);
    expect(platform).toBeInstanceOf(Platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Finished initializing platform:', config.name);
    await platform.onShutdown();
  });

  it('should throw error in load when version is not valid', () => {
    expect(() => new Platform({ ...matterbridge, matterbridgeVersion: '3.8.0' }, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.9.0". Please update Matterbridge to the latest version in the frontend.',
    );
  });

  it('should initialize platform with config name', () => {
    platform = new Platform(matterbridge, log, config);
    addMatterbridge(platform);
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
      const internal = await internalFor(device, DoorLock);
      expect(internal).toBeDefined();
      if (internal) internal.enableTimeout = false;
      await device?.invokeBehaviorCommand(DoorLock, 'lockDoor', {});
      await device?.invokeBehaviorCommand(DoorLock, 'unlockDoor', {});
      await device?.invokeBehaviorCommand(DoorLock, 'unlockWithTimeout', { timeout: 1 });
    }

    // Test setters
    for (const setter of setters) {
      const device = platform.getDeviceById(platform.getId(setter));
      expect(device).toBeDefined();
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(100);
    }

    // Test triggers
    for (const trigger of triggers) {
      platform.currentMode = trigger.replaceAll('Trigger', 'Mode') as Modes;
      const device = platform.getDeviceById(platform.getId(trigger));
      expect(device).toBeDefined();
      platform.currentMode = MODE_OFF;
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(100);
      platform.currentMode = MODE_VACATION;
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(100);
      platform.currentMode = MODE_NIGHT;
      await device?.invokeBehaviorCommand(OnOff, 'on');
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
