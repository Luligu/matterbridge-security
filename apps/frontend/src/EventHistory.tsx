/**
 * @file apps/frontend/src/EventHistory.tsx
 * @description Security event history table.
 * @author Luca Liguori
 * @created 2026-10-17
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

import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

const eventColors = { mode: 'info', trigger: 'error', startup: 'success', shutdown: 'warning' } as const;
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

type HistoryEvent = { datetime: string; event: string; type: keyof typeof eventColors };

/**
 * Validate an event received from the plugin API.
 *
 * @param {unknown} value API event to validate.
 * @returns {boolean} Whether the event has a valid timestamp, name and type.
 */
function isHistoryEvent(value: unknown): value is HistoryEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'datetime' in value &&
    typeof value.datetime === 'string' &&
    Number.isFinite(Date.parse(value.datetime)) &&
    'event' in value &&
    typeof value.event === 'string' &&
    'type' in value &&
    typeof value.type === 'string' &&
    Object.hasOwn(eventColors, value.type)
  );
}

/**
 * Display security events with localized timestamps and color-coded event types.
 *
 * @returns {JSX.Element} The event history table and its loading or error state.
 */
export default function EventHistory() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadEvents = useCallback(
    async (signal?: AbortSignal) =>
      fetch('/plugins/matterbridge-security/api/events', { signal, headers: { Accept: 'application/json' } })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Unable to load event history (HTTP ${response.status}).`);
          const data: unknown = await response.json();
          if (!Array.isArray(data) || !data.every(isHistoryEvent)) throw new Error('The plugin returned invalid event history.');
          if (!signal?.aborted) setEvents(data);
          return data;
        })
        .catch((cause: unknown) => {
          if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'Unable to load event history.');
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  return (
    <Box component="section" aria-labelledby="event-history-title">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography id="event-history-title" variant="h5" component="h2">
            Event history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recorded events, oldest first. Times are shown in your local timezone.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            setLoading(true);
            setError(undefined);
            void loadEvents();
          }}
          disabled={loading}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
        {loading && <LinearProgress aria-label="Loading event history" />}
        <TableContainer>
          <Table aria-label="Security event history" aria-busy={loading}>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell>Date and time</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Event</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event, index) => (
                <TableRow key={`${event.datetime}-${event.type}-${event.event}-${index}`} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    <time dateTime={event.datetime} title={event.datetime}>
                      {dateFormatter.format(new Date(event.datetime))}
                    </time>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.type === 'trigger' ? 'alarm' : event.type}
                      color={eventColors[event.type]}
                      size="small"
                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{event.type === 'trigger' ? event.event.replace(/^Trigger\b/, 'Alarm') : event.event}</TableCell>
                </TableRow>
              ))}
              {!loading && !error && events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No security events recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
