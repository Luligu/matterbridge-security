/**
 * @file vitest/historyGraph.test.ts
 * @description Endpoint graph filtering, ordering and local calendar totals.
 * @author Luca Liguori
 */

import { buildEventGraph, type HistoryEvent } from '../apps/frontend/src/historyGraph.js';

const history: HistoryEvent[] = [
  { datetime: '2026-10-25T12:00:00.000Z', event: 'Mode Away', type: 'mode' },
  { datetime: '2026-10-25T12:05:00.000Z', event: 'Trigger Away', type: 'trigger' },
  { datetime: '2026-10-25T12:10:00.000Z', event: 'Mode Home', type: 'mode' },
  { datetime: '2026-10-26T12:00:00.000Z', event: 'Mode Away', type: 'mode' },
  { datetime: '2026-10-26T12:01:00.000Z', event: 'Startup', type: 'startup' },
];

describe('Endpoint graph data', () => {
  it('should select only exact endpoint occurrences', () => {
    expect(buildEventGraph(history, 'Mode Away').events).toEqual([history[0], history[3]]);
    expect(buildEventGraph(history, 'Trigger Away').events).toEqual([history[1]]);
    expect(buildEventGraph(history, 'Away').events).toEqual([]);
    expect(buildEventGraph(history, 'Startup').events).toEqual([]);
  });

  it.each(['Away', 'Home', 'Night', 'Vacation', 'Off'])('should graph Set %s from corresponding mode changes only', (name) => {
    const mode: HistoryEvent = { datetime: '2026-10-26T12:00:00.000Z', event: `Mode ${name}`, type: 'mode' };
    const trigger: HistoryEvent = { ...mode, event: `Trigger ${name}`, type: 'trigger' };
    const other: HistoryEvent = { ...mode, event: 'Mode Unknown' };
    expect(buildEventGraph([mode, trigger, other], `Set ${name}`).events).toEqual([mode]);
    expect(buildEventGraph([mode], 'Set Unknown').events).toEqual([]);
  });

  it.each(['Away', 'Home', 'Night', '24h'])('should graph Alert %s from its matching accepted trigger only', (name) => {
    const trigger: HistoryEvent = { datetime: '2026-10-26T12:00:00.000Z', event: `Trigger ${name}`, type: 'trigger' };
    const mode: HistoryEvent = { ...trigger, event: `Mode ${name}`, type: 'mode' };
    const other: HistoryEvent = { ...trigger, event: 'Trigger Unknown' };
    expect(buildEventGraph([trigger, mode, other], `Alert ${name}`).events).toEqual([trigger]);
  });

  it('should graph Alert Master from all four accepted trigger types', () => {
    const triggers: HistoryEvent[] = ['Away', 'Home', 'Night', '24h'].map((name) => ({
      datetime: '2026-10-26T12:00:00.000Z',
      event: `Trigger ${name}`,
      type: 'trigger',
    }));
    const result = buildEventGraph([...history, ...triggers], 'Alert Master');
    expect(result.events).toEqual([history[1], ...triggers]);
    expect(result.days.reduce((count, day) => count + day.count, 0)).toBe(5);
    expect(buildEventGraph(history, 'Alert Unknown').events).toEqual([]);
  });

  it('should sort occurrences without changing the original history', () => {
    const reversed = history.toReversed();
    const original = [...reversed];
    expect(buildEventGraph(reversed, 'Mode Away').events).toEqual([history[0], history[3]]);
    expect(reversed).toEqual(original);
  });

  it('should group by local calendar date and preserve repeated occurrences', () => {
    const first = new Date(2026, 9, 25, 23, 59).toISOString();
    const next = new Date(2026, 9, 26, 0, 1).toISOString();
    const data: HistoryEvent[] = [
      { datetime: first, event: 'Trigger Away', type: 'trigger' },
      { datetime: first, event: 'Trigger Away', type: 'trigger' },
      { datetime: next, event: 'Trigger Away', type: 'trigger' },
    ];
    const result = buildEventGraph(data, 'Trigger Away');
    expect(result.events).toHaveLength(3);
    expect(result.days).toEqual([
      { date: new Date(2026, 9, 25), count: 2 },
      { date: new Date(2026, 9, 26), count: 1 },
    ]);
  });

  it('should return empty data for empty history and unknown endpoints', () => {
    expect(buildEventGraph([], 'Mode Away')).toEqual({ events: [], days: [] });
    expect(buildEventGraph(history, 'Mode Unknown')).toEqual({ events: [], days: [] });
  });

  it('should keep a single matching occurrence', () => {
    const result = buildEventGraph(history, 'Trigger Away');
    expect(result.events).toEqual([history[1]]);
    expect(result.days.map((day) => day.count)).toEqual([1]);
  });
});
