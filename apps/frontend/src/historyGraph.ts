/**
 * @file apps/frontend/src/historyGraph.ts
 * @description Endpoint graph data preparation.
 * @author Luca Liguori
 * @created 2026-10-26
 * @version 1.0.0
 * @license Apache-2.0
 *
 * Copyright 2026 Luca Liguori.
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

export type HistoryEvent = { datetime: string; event: string; type: 'mode' | 'trigger' | 'startup' | 'shutdown' };

const setterModes: Readonly<Record<string, string>> = {
  'Set Away': 'Mode Away',
  'Set Home': 'Mode Home',
  'Set Night': 'Mode Night',
  'Set Vacation': 'Mode Vacation',
  'Set Off': 'Mode Off',
};

const alertTriggers: Readonly<Record<string, readonly string[]>> = {
  'Alert Away': ['Trigger Away'],
  'Alert Home': ['Trigger Home'],
  'Alert Night': ['Trigger Night'],
  'Alert 24h': ['Trigger 24h'],
  'Alert Master': ['Trigger Away', 'Trigger Home', 'Trigger Night', 'Trigger 24h'],
};

/**
 * Select one endpoint's recorded occurrences and group them by local calendar day.
 *
 * @param {readonly HistoryEvent[]} history Retained security history.
 * @param {string} endpoint Exact endpoint name from the URL. Alerts use activating triggers; setters use corresponding mode changes.
 * @returns {{ events: HistoryEvent[]; days: { date: Date; count: number }[] }} Sorted occurrences and daily totals, including repeated timestamps.
 */
export function buildEventGraph(history: readonly HistoryEvent[], endpoint: string) {
  const events = history
    .filter(
      (event) =>
        ((event.type === 'mode' || event.type === 'trigger') && event.event === endpoint) ||
        (event.type === 'mode' && Object.hasOwn(setterModes, endpoint) && event.event === setterModes[endpoint]) ||
        (event.type === 'trigger' && Object.hasOwn(alertTriggers, endpoint) && alertTriggers[endpoint].includes(event.event)),
    )
    .toSorted((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
  const totals = new Map<number, number>();
  for (const event of events) {
    const date = new Date(event.datetime);
    date.setHours(0, 0, 0, 0);
    const day = date.getTime();
    totals.set(day, (totals.get(day) ?? 0) + 1);
  }
  return { events, days: Array.from(totals, ([day, count]) => ({ date: new Date(day), count })) };
}
