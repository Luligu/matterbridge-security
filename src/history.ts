/**
 * @file src/history.ts
 * @description Persistent security event history.
 * @author Luca Liguori
 * @created 2026-10-17
 * @version 1.0.3
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

import type { NodeStorage } from 'node-persist-manager';

import type { Modes, Triggers } from './module.js';

type SecurityEventData = { event: Modes; type: 'mode' } | { event: Triggers; type: 'trigger' } | { event: 'Startup'; type: 'startup' } | { event: 'Shutdown'; type: 'shutdown' };

export type SecurityEvent = { datetime: string } & SecurityEventData;

/**
 * Store a configured number of security events in chronological order.
 */
export class SecurityHistory {
  events: SecurityEvent[] = [];
  private eventWrite: Promise<void> = Promise.resolve();
  private readonly eventsNumber: number;

  /**
   * Create a new security history store.
   *
   * @param {number} [eventsNumber] Maximum number of events to retain, from 100 to 1000, defaulting to 200.
   * @throws {Error} If the limit is not an integer between 100 and 1000.
   */
  constructor(eventsNumber = 200) {
    if (!Number.isInteger(eventsNumber) || eventsNumber < 100 || eventsNumber > 1000) throw new Error('eventsNumber must be an integer between 100 and 1000.');
    this.eventsNumber = eventsNumber;
  }

  /**
   * Restore security history during startup.
   *
   * @param {NodeStorage | undefined} context Plugin storage.
   * @returns {Promise<NodeStorage>} Plugin storage after history has been loaded.
   * @throws {Error} If plugin storage is unavailable or history cannot be read.
   */
  async load(context: NodeStorage | undefined): Promise<NodeStorage> {
    if (!context) throw new Error('Plugin storage is not available for security event history.');
    this.events = (await context.get<SecurityEvent[]>('SecurityEvents', [])).slice(-this.eventsNumber);
    return context;
  }

  /**
   * Timestamp an event and persist history up to the configured limit.
   *
   * @param {NodeStorage | undefined} context Plugin storage.
   * @param {SecurityEventData} event Mode change, accepted trigger or lifecycle event to record.
   * @returns {Promise<void>} Resolves when the updated history is stored.
   * @throws {Error} If plugin storage is unavailable or the history cannot be stored.
   */
  async add(context: NodeStorage | undefined, event: SecurityEventData): Promise<void> {
    if (!context) throw new Error('Plugin storage is not available for security event history.');
    this.events = [...this.events, { datetime: new Date().toISOString(), ...event }].slice(-this.eventsNumber);
    const events = this.events;
    const save = async (): Promise<void> => {
      await context.set('SecurityEvents', events);
    };
    this.eventWrite = this.eventWrite.then(save, save);
    await this.eventWrite;
  }
}
