/**
 * @file vitest/module.test.ts
 * @description This file contains the tests for the Platform class.
 * @author Luca Liguori
 */

const MATTER_PORT = 6000;
const NAME = 'Platform';
const MATTER_CREATE_ONLY = true;

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { internalFor, type PlatformMatterbridge } from 'matterbridge';
import { DoorLock, OnOff } from 'matterbridge/matter/clusters';
import {
  addMatterbridge,
  createServerNode,
  createTestEnvironment,
  destroyTestEnvironment,
  flushServerNode,
  getMatterbridge,
  log,
  loggerInfoSpy,
  setupTest,
  startServerNode,
  stopServerNode,
} from 'matterbridge/test-utils/vitest';
import { wait } from 'matterbridge/utils';

import type { SecurityEvent } from '../src/history.js';
import initializePlugin, {
  MODE_AWAY,
  MODE_NIGHT,
  MODE_OFF,
  MODE_VACATION,
  type Modes,
  modes,
  Platform,
  type SecurityPlatformConfig,
  setters,
  TRIGGER_AWAY,
  TRIGGER_HOME,
  triggers,
} from '../src/module.js';

// Setup the test environment
await setupTest(NAME, false);

describe('TestPlatform', () => {
  let matterbridge: PlatformMatterbridge;
  let platform: Platform;
  const pause = process.env.GITHUB_ACTIONS === 'true' ? 250 : 100;

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
    await platform.ready;
    await platform.onShutdown();
  });

  it('should throw error in load when version is not valid', () => {
    expect(() => new Platform({ ...matterbridge, matterbridgeVersion: '3.8.0' }, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.10.10". Please update Matterbridge to the latest version in the frontend.',
    );
  });

  it('should initialize platform with config name', () => {
    const legacyConfig = { ...config };
    Reflect.deleteProperty(legacyConfig, 'eventsNumber');
    platform = new Platform(matterbridge, log, legacyConfig);
    addMatterbridge(platform);
    expect(platform.config.eventsNumber).toBe(100);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Initializing platform:', config.name);
    expect(loggerInfoSpy).toHaveBeenCalledWith('Finished initializing platform:', config.name);
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    platform.shortTimeout = 10;
    platform.config.alertTimeout = 0.001;
    expect(loggerInfoSpy).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');

    // Test modes
    for (const mode of modes) {
      const device = platform.getDeviceById(platform.getId(mode));
      expect(device).toBeDefined();
      if (!device) continue;
      const internal = await internalFor(device, DoorLock);
      expect(internal).toBeDefined();
      if (internal) internal.enableTimeout = false;
      await device?.invokeBehaviorCommand(DoorLock, 'lockDoor', {});
      await wait(pause);
      await device?.invokeBehaviorCommand(DoorLock, 'unlockDoor', {});
      await wait(pause);
      await device?.invokeBehaviorCommand(DoorLock, 'unlockWithTimeout', { timeout: 1 });
      await wait(pause);
    }

    // Test setters
    for (const setter of setters) {
      const device = platform.getDeviceById(platform.getId(setter));
      expect(device).toBeDefined();
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(pause);
    }

    // Test triggers
    for (const trigger of triggers) {
      platform.currentMode = trigger.replaceAll('Trigger', 'Mode') as Modes;
      const device = platform.getDeviceById(platform.getId(trigger));
      expect(device).toBeDefined();
      platform.currentMode = MODE_OFF;
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(pause);
      platform.currentMode = MODE_VACATION;
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(pause);
      platform.currentMode = MODE_NIGHT;
      await device?.invokeBehaviorCommand(OnOff, 'on');
      await wait(pause);
    }
    platform.config.unregisterOnShutdown = true;
    await platform.onShutdown('Test reason');

    platform.shortTimeout = 500;
    platform.config.alertTimeout = 60;
    platform.config.unregisterOnShutdown = false;
  });

  it('should call onStart without reason', async () => {
    platform = new Platform(matterbridge, log, { ...config });
    addMatterbridge(platform);
    platform.config.useSwitch = true;
    await platform.onStart();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onStart called with reason:', 'none');
  });

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onConfigure called');
  });

  it('should call onShutdown with reason', async () => {
    platform.config.unregisterOnShutdown = true;
    await platform.onShutdown('Test reason');
    expect(loggerInfoSpy).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });

  it('should call onShutdown without reason', async () => {
    platform = new Platform(matterbridge, log, { ...config });
    addMatterbridge(platform);
    platform.config.unregisterOnShutdown = true;
    await platform.ready;
    await platform.onShutdown();
    expect(loggerInfoSpy).toHaveBeenCalledWith('onShutdown called with reason:', 'none');
  });

  describe('Platform event recording', () => {
    let historyPlatform: Platform;

    beforeEach(async () => {
      historyPlatform = new Platform(matterbridge, log, { ...config, unregisterOnShutdown: true });
      addMatterbridge(historyPlatform);
      await historyPlatform.ready;
      await historyPlatform.context?.set('SecurityEvents', []);
      await historyPlatform.context?.set('LastSecurityMode', MODE_OFF);
    });

    afterEach(async () => {
      await historyPlatform.onShutdown();
    });

    it('should return all events from the plugin history API', async () => {
      await historyPlatform.syncronizeModes(MODE_AWAY);
      expect(await historyPlatform.onFetch('GET', 'events')).toEqual(historyPlatform.events);
      expect(historyPlatform.events).toHaveLength(1);
    });

    it('should delegate unsupported API requests to the base platform', async () => {
      expect(await historyPlatform.onFetch('POST', 'events')).toBeUndefined();
      expect(await historyPlatform.onFetch('GET', 'unknown')).toBeUndefined();
      expect(await historyPlatform.onFetch('GET')).toBeUndefined();
    });

    it('should persist mode changes without recording repeated modes', async () => {
      const datetime = '2026-10-17T17:38:25.632Z';
      const now = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(datetime);
      try {
        await historyPlatform.syncronizeModes(MODE_AWAY);
        await historyPlatform.syncronizeModes(MODE_AWAY);
        await historyPlatform.setModeOff();
        await historyPlatform.setModeOff();
        expect(historyPlatform.events).toEqual([
          { datetime, event: MODE_AWAY, type: 'mode' },
          { datetime, event: MODE_OFF, type: 'mode' },
        ]);
        expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(historyPlatform.events);
        expect(await historyPlatform.context?.get('LastSecurityMode')).toBe(MODE_OFF);
      } finally {
        now.mockRestore();
      }
    });

    it('should restore history and mode and append a startup event without a duplicate mode event', async () => {
      const events: SecurityEvent[] = [{ datetime: '2026-10-17T17:38:25.632Z', event: MODE_AWAY, type: 'mode' }];
      await historyPlatform.context?.set('SecurityEvents', events);
      await historyPlatform.context?.set('LastSecurityMode', MODE_AWAY);
      await historyPlatform.onStart();
      expect(historyPlatform.config.eventsNumber).toBe(100);
      expect(historyPlatform.currentMode).toBe(MODE_AWAY);
      expect(historyPlatform.events).toEqual([...events, { datetime: expect.any(String), event: 'Startup', type: 'startup' }]);
      expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(historyPlatform.events);
    });

    it('should use the configured number of events after startup', async () => {
      historyPlatform.config.eventsNumber = 10;
      await historyPlatform.onStart();
      for (let index = 0; index < 5; index++) {
        await historyPlatform.syncronizeModes(MODE_AWAY);
        await historyPlatform.setModeOff();
      }
      expect(historyPlatform.events.map((event) => event.event)).toEqual(Array.from({ length: 10 }, (_, index) => (index % 2 === 0 ? MODE_AWAY : MODE_OFF)));
      expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(historyPlatform.events);
    });

    it('should record only triggers that activate alerts', async () => {
      await historyPlatform.onStart();
      historyPlatform.config.alertTimeout = 0;
      historyPlatform.shortTimeout = 1;
      const away = historyPlatform.getDeviceById(historyPlatform.getId(TRIGGER_AWAY));
      const home = historyPlatform.getDeviceById(historyPlatform.getId(TRIGGER_HOME));
      expect(away).toBeDefined();
      expect(home).toBeDefined();
      await away?.invokeBehaviorCommand(OnOff, 'on');
      expect(historyPlatform.events.map((event) => event.type)).toEqual(['startup']);
      await historyPlatform.syncronizeModes(MODE_VACATION);
      await home?.invokeBehaviorCommand(OnOff, 'on');
      expect(historyPlatform.events).toHaveLength(2);
      await away?.invokeBehaviorCommand(OnOff, 'on');
      expect(historyPlatform.events).toHaveLength(3);
      expect(historyPlatform.events[2]).toEqual({
        datetime: expect.any(String),
        event: TRIGGER_AWAY,
        type: 'trigger',
      });
      expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(historyPlatform.events);
      await wait(pause);
    });

    it('should persist shutdown after pending events and restore it on the next startup', async () => {
      await historyPlatform.onStart();
      const pending = historyPlatform.syncronizeModes(MODE_AWAY);
      await historyPlatform.onShutdown();
      await pending;
      expect(historyPlatform.events.map((event) => event.type)).toEqual(['startup', 'mode', 'shutdown']);
      const previousEvents = [...historyPlatform.events];
      historyPlatform = new Platform(matterbridge, log, { ...config, unregisterOnShutdown: true });
      addMatterbridge(historyPlatform);
      await historyPlatform.onStart();
      expect(historyPlatform.events).toEqual([...previousEvents, { datetime: expect.any(String), event: 'Startup', type: 'startup' }]);
      expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(historyPlatform.events);
    });

    it('should preserve restored history without reloading it during shutdown', async () => {
      const events: SecurityEvent[] = [{ datetime: '2026-10-17T17:38:25.632Z', event: MODE_AWAY, type: 'mode' }];
      await historyPlatform.context?.set('SecurityEvents', events);
      await historyPlatform.onStart();
      const context = historyPlatform.context;
      if (!context) throw new Error('Test platform storage is unavailable.');
      const get = vi.spyOn(context, 'get');
      await historyPlatform.onShutdown();
      expect(get).not.toHaveBeenCalled();
      const expected = [...events, { datetime: expect.any(String), event: 'Startup', type: 'startup' }, { datetime: expect.any(String), event: 'Shutdown', type: 'shutdown' }];
      expect(historyPlatform.events).toEqual(expected);
      historyPlatform = new Platform(matterbridge, log, { ...config, unregisterOnShutdown: true });
      addMatterbridge(historyPlatform);
      await historyPlatform.ready;
      expect(await historyPlatform.context?.get('SecurityEvents')).toEqual(expected);
    });
  });
});
