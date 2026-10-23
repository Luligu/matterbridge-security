/**
 * @file vitest/history.test.ts
 * @description Tests for persistent security event history.
 * @author Luca Liguori
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { type NodeStorage, NodeStorageManager } from 'node-persist-manager';

import { type SecurityEvent, SecurityHistory } from '../src/history.js';

describe('SecurityHistory', () => {
  const datetime = '2026-10-17T17:38:25.632Z';
  let directory: string;
  let manager: NodeStorageManager;
  let context: NodeStorage;
  let history: SecurityHistory;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'matterbridge-security-history-'));
    manager = new NodeStorageManager({ dir: directory, writeQueue: false, expiredInterval: undefined });
    context = await manager.createStorage('history');
    history = new SecurityHistory();
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(datetime);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await manager.close();
    await rm(directory, { recursive: true, force: true });
  });

  it('should load an empty history when no events are stored', async () => {
    expect(await history.load(context)).toBe(context);
    expect(history.events).toEqual([]);
  });

  it('should restore only the latest 100 stored events in chronological order', async () => {
    const events: SecurityEvent[] = Array.from({ length: 101 }, (_, index) => ({
      datetime: `2026-10-17T17:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
      event: index === 0 ? 'Mode Off' : 'Mode Away',
      type: 'mode',
    }));
    await context.set('SecurityEvents', events);
    await history.load(context);
    expect(history.events).toEqual(events.slice(1));
  });

  it('should timestamp and persist mode, trigger, startup and shutdown events', async () => {
    await history.add(context, { event: 'Startup', type: 'startup' });
    await history.add(context, { event: 'Mode Away', type: 'mode' });
    await history.add(context, { event: 'Trigger Away', type: 'trigger' });
    await history.add(context, { event: 'Shutdown', type: 'shutdown' });
    expect(history.events).toEqual([
      { datetime, event: 'Startup', type: 'startup' },
      { datetime, event: 'Mode Away', type: 'mode' },
      { datetime, event: 'Trigger Away', type: 'trigger' },
      { datetime, event: 'Shutdown', type: 'shutdown' },
    ]);
    expect(await context.get('SecurityEvents')).toEqual(history.events);
    const restored = new SecurityHistory();
    await restored.load(context);
    expect(restored.events).toEqual(history.events);
  });

  it('should discard the oldest event when adding event 101', async () => {
    await history.add(context, { event: 'Startup', type: 'startup' });
    for (let index = 0; index < 100; index++) {
      await history.add(context, { event: 'Trigger Away', type: 'trigger' });
    }
    expect(history.events).toHaveLength(100);
    expect(history.events.every((event) => event.type === 'trigger')).toBe(true);
    expect(await context.get('SecurityEvents')).toEqual(history.events);
  });

  it.each([10, 1000])('should apply the configured limit of %s to restored and new events', async (limit) => {
    const events: SecurityEvent[] = Array.from({ length: limit + 1 }, () => ({ datetime, event: 'Trigger Away', type: 'trigger' }));
    await context.set('SecurityEvents', events);
    await history.load(context, limit);
    expect(history.events).toEqual(events.slice(-limit));
    await history.add(context, { event: 'Shutdown', type: 'shutdown' });
    expect(history.events).toEqual([...events.slice(-(limit - 1)), { datetime, event: 'Shutdown', type: 'shutdown' }]);
    expect(await context.get('SecurityEvents')).toEqual(history.events);
  });

  it.each([0, -1, 9, 1001, 10.5, Number.NaN, Infinity])('should reject invalid event limit %s', async (limit) => {
    await expect(history.load(context, limit)).rejects.toThrow('eventsNumber must be an integer between 10 and 1000.');
  });

  it('should serialize concurrent writes while an earlier write is pending', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = context.set.bind(context);
    const set = vi.spyOn(context, 'set').mockImplementationOnce(async (key, value) => {
      await gate;
      return save(key, value);
    });
    const first = history.add(context, { event: 'Startup', type: 'startup' });
    const second = history.add(context, { event: 'Shutdown', type: 'shutdown' });
    await Promise.resolve();
    try {
      expect(set).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenNthCalledWith(1, 'SecurityEvents', [{ datetime, event: 'Startup', type: 'startup' }]);
    } finally {
      release();
      await Promise.all([first, second]);
    }
    expect(set).toHaveBeenCalledTimes(2);
    expect(await context.get('SecurityEvents')).toEqual([
      { datetime, event: 'Startup', type: 'startup' },
      { datetime, event: 'Shutdown', type: 'shutdown' },
    ]);
  });

  it('should surface read failures', async () => {
    vi.spyOn(context, 'get').mockRejectedValueOnce(new Error('Storage read failed'));
    await expect(history.load(context)).rejects.toThrow('Storage read failed');
  });

  it('should surface write failures and allow the next event to be saved', async () => {
    vi.spyOn(context, 'set').mockRejectedValueOnce(new Error('Storage write failed'));
    await expect(history.add(context, { event: 'Startup', type: 'startup' })).rejects.toThrow('Storage write failed');
    await history.add(context, { event: 'Shutdown', type: 'shutdown' });
    expect(await context.get('SecurityEvents')).toEqual(history.events);
    expect(history.events).toHaveLength(2);
  });

  it('should reject loading and recording when storage is unavailable', async () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- The required argument exercises missing-storage validation.
    await expect(history.load(undefined)).rejects.toThrow('Plugin storage is not available for security event history.');
    await expect(history.add(undefined, { event: 'Startup', type: 'startup' })).rejects.toThrow('Plugin storage is not available for security event history.');
    expect(history.events).toEqual([]);
  });
});
