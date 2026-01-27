const MATTER_PORT = 6000;
const NAME = 'Platform';
const HOMEDIR = path.join('jest', NAME);

import path from 'node:path';

import { PlatformConfig } from 'matterbridge';
import { jest } from '@jest/globals';
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

import initializePlugin, { Platform } from './module.js';

setupTest('Platform');

describe('TestPlatform', () => {
  let platform: Platform;

  const config: PlatformConfig = {
    name: 'matterbridge-security',
    type: 'DynamicPlatform',
    version: '1.0.0',
    debug: false,
    unregisterOnShutdown: false,
  };

  beforeAll(async () => {
    // Create Matterbridge environment
    await createMatterbridgeEnvironment(NAME);
    await startMatterbridgeEnvironment(MATTER_PORT);
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  afterAll(async () => {
    // Destroy Matterbridge environment
    await stopMatterbridgeEnvironment();
    await destroyMatterbridgeEnvironment();

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
    matterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new Platform(matterbridge, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.5.0". Please update Matterbridge to the latest version in the frontend.',
    );
    matterbridge.matterbridgeVersion = '3.5.0';
  });

  it('should initialize platform with config name', () => {
    platform = new Platform(matterbridge, log, config);
    addMatterbridgePlatform(platform);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Finished initializing platform:', config.name);
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
  });

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onConfigure called');
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
