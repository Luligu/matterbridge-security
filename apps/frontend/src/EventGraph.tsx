/**
 * @file apps/frontend/src/EventGraph.tsx
 * @description Selectable endpoint occurrence graphs.
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

import { Box, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

import { buildEventGraph, type HistoryEvent } from './historyGraph.ts';

const views = [
  { id: 'timeline', title: 'Timeline', description: 'Each bar marks one recorded occurrence. Horizontal spacing represents elapsed time; bar width does not represent duration.' },
  { id: 'daily', title: 'Daily totals', description: 'Occurrences per local calendar day. Only days with matching events are shown.' },
] as const;
type GraphView = (typeof views)[number]['id'];
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
const axisFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const left = 56;

/**
 * Render one endpoint's occurrences in a selectable set of graph views.
 *
 * @param {object} props Component props.
 * @param {readonly HistoryEvent[]} props.events All retained history, before endpoint filtering.
 * @param {string} props.endpoint Exact selected endpoint name.
 * @returns {JSX.Element} View controls, summary and endpoint graphs.
 */
export default function EventGraph({ events, endpoint }: { events: readonly HistoryEvent[]; endpoint: string }) {
  const [view, setView] = useState<GraphView | 'all'>('all');
  const data = buildEventGraph(events, endpoint);
  const first = data.events[0];
  const last = data.events.at(-1);
  const label = endpoint.replace(/^Trigger\b/, 'Alarm');

  return (
    <Box>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip label={`${data.events.length} recorded occurrences`} color={endpoint.startsWith('Trigger ') || endpoint.startsWith('Alert ') ? 'error' : 'info'} variant="outlined" />
        {first && <Chip label={`First: ${dateFormatter.format(new Date(first.datetime))}`} variant="outlined" />}
        {last && <Chip label={`Latest: ${dateFormatter.format(new Date(last.datetime))}`} variant="outlined" />}
      </Stack>
      <ToggleButtonGroup
        value={view}
        exclusive
        size="small"
        aria-label="Graph view"
        onChange={(_event, value: GraphView | 'all' | null) => {
          if (value !== null) setView(value);
        }}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value="all">Compare all</ToggleButton>
        {views.map((option) => (
          <ToggleButton key={option.id} value={option.id}>
            {option.title}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Recorded occurrences of {label} only. Times use your local timezone. These graphs show events, not the duration of an active mode or alarm.
      </Typography>
      {endpoint.startsWith('Set ') && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Changes to {endpoint.replace(/^Set\b/, 'Mode')} from any control. Setter presses are not recorded separately.
        </Typography>
      )}
      {endpoint.startsWith('Alert ') && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {endpoint === 'Alert Master' ? 'Activations from all accepted triggers.' : `Activations from ${endpoint.replace(/^Alert\b/, 'Trigger')}.`}
        </Typography>
      )}
      {data.events.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No recorded occurrences for {label} in the retained history.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {views
            .filter((option) => view === 'all' || option.id === view)
            .map((option) => (
              <Paper key={option.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" component="h3">
                  {option.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {option.description}
                </Typography>
                <OccurrenceChart data={data} view={option.id} label={label} />
              </Paper>
            ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * Draw an accessible SVG chart with theme colors and exact-value tooltips.
 *
 * @param {object} props Component props.
 * @param {ReturnType<typeof buildEventGraph>} props.data Sorted endpoint occurrences and daily counts.
 * @param {GraphView} props.view Graph representation to draw.
 * @param {string} props.label Human-readable endpoint name.
 * @returns {JSX.Element} A horizontally scrollable chart with axes and tooltips.
 */
function OccurrenceChart({ data, view, label }: { data: ReturnType<typeof buildEventGraph>; view: GraphView; label: string }) {
  const theme = useTheme();
  const width = view === 'daily' ? Math.max(920, data.days.length * 38) : 920;
  const right = width - 24;
  const top = view === 'timeline' ? 16 : 24;
  const bottom = view === 'timeline' ? 64 : 180;
  const color = label.startsWith('Alarm ') || label.startsWith('Alert ') ? theme.palette.error.main : theme.palette.info.main;
  const firstTime = Date.parse(data.events[0].datetime);
  const lastTime = Date.parse(data.events[data.events.length - 1].datetime);
  const padding = Math.max((lastTime - firstTime) * 0.04, 60_000);
  const start = firstTime - padding;
  const end = lastTime + padding;
  const x = (time: number) => left + ((time - start) / (end - start)) * (right - left);
  const maxCount = view === 'daily' ? Math.max(1, ...data.days.map((day) => day.count)) : 1;
  const y = (count: number) => bottom - (count / maxCount) * (bottom - top);
  const ticks = Array.from(new Set([0, Math.ceil(maxCount / 2), maxCount]));

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${bottom + 60}`}
        aria-label={`${label}: ${view} graph, ${data.events.length} recorded occurrences`}
        style={{ width: '100%', minWidth: width, display: 'block', color: theme.palette.text.secondary }}
      >
        <desc>Only recorded occurrences of this endpoint are shown. Hover or focus a bar to see its exact value.</desc>
        {ticks.map((count) => (
          <g key={count}>
            <line x1={left} x2={right} y1={y(count)} y2={y(count)} stroke={theme.palette.divider} />
            <text x={left - 12} y={y(count) + 4} textAnchor="end" fill="currentColor" fontSize={12}>
              {view === 'timeline' ? (count === 0 ? 'Off' : 'On') : count}
            </text>
          </g>
        ))}
        {view === 'daily' ? (
          data.days.map((day, index) => {
            const slot = (right - left) / data.days.length;
            const barX = left + index * slot + slot * 0.15;
            const title = `${dayFormatter.format(day.date)}: ${day.count} occurrences`;
            return (
              <g key={day.date.getTime()}>
                <Tooltip title={title} arrow>
                  <rect x={barX} y={y(day.count)} width={slot * 0.7} height={bottom - y(day.count)} rx={3} fill={color} tabIndex={0} aria-label={title} />
                </Tooltip>
                {(index % Math.ceil(data.days.length / 6) === 0 || index === data.days.length - 1) && (
                  <text x={left + (index + 0.5) * slot} y={bottom + 25} textAnchor="middle" fill="currentColor" fontSize={11}>
                    {dayFormatter.format(day.date)}
                  </text>
                )}
              </g>
            );
          })
        ) : (
          <>
            {data.events.map((event, index) => {
              const position = x(Date.parse(event.datetime));
              const title = `${dateFormatter.format(new Date(event.datetime))} · ${label}`;
              return (
                <Tooltip key={`${event.datetime}-${index}`} title={title} arrow>
                  <rect x={position - 5} y={top} width={10} height={bottom - top} rx={2} fill={color} tabIndex={0} aria-label={title} />
                </Tooltip>
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <text key={fraction} x={left + fraction * (right - left)} y={bottom + 25} textAnchor="middle" fill="currentColor" fontSize={11}>
                {axisFormatter.format(new Date(start + fraction * (end - start)))}
              </text>
            ))}
          </>
        )}
        <text x={(left + right) / 2} y={bottom + 52} textAnchor="middle" fill="currentColor" fontSize={12}>
          {view === 'daily' ? 'Local days with recorded events' : 'Local date and time'}
        </text>
      </svg>
    </Box>
  );
}
