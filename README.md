# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge security plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Luligu/b21088ab9c9f2b119b42c33f0fef218d/raw/docker.json)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-security/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-security/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-security/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/matterbridge-security)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/styled_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![matterbridge.io](https://img.shields.io/badge/matterbridge.io-online-brightgreen)](https://matterbridge.io)

[![powered by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![powered by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![powered by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

This plugin allows you to create a security system.

## Features

- Five preconfigured modes: Home, Away, Night, Vacation, Off.
- Five preconfigured setters: Home, Away, Night, Vacation, Off.
- Four preconfigured triggers: Home, Away, Night, 24h.
- Five preconfigured alerts: Home, Away, Night, 24h, Master.
- Persistent history of mode changes, accepted triggers, startups and shutdowns, with timestamps and a configurable event limit (default: 200).
- Color-coded frontend event table with local date and time display.
- Endpoint [graphs](./screenshots/main.png) for [modes](./screenshots/modes.png), setters, triggers and alerts, with a compact timeline, daily totals and date/time tooltips.

The plugin requires matterbridge v.3.11.0.

### Modes

| Mode     | Use                                                               |
| -------- | ----------------------------------------------------------------- |
| Home     | Standard mode when you are at home.                               |
| Away     | Use when nobody is home (full protection).                        |
| Night    | Use at night (typically perimeter/partial protection).            |
| Vacation | Same as Away; useful for extended absences and light automations. |
| Off      | Disables the security system.                                     |

Each mode is exclusive: the other will revert their state.

Mode vacation works exactly like mode away. Is useful to create on the controller some automations that turn on and off internal lights when you are on vacation.

### Setters

| Setter   | Use                               |
| -------- | --------------------------------- |
| Home     | Sets the system mode to Home.     |
| Away     | Sets the system mode to Away.     |
| Night    | Sets the system mode to Night.    |
| Vacation | Sets the system mode to Vacation. |
| Off      | Sets the system mode to Off.      |

Setters will set the corresponding mode and will revert immediately their state.

Is usefull when the controller doesn't allow to lock unlock doors from presence automations. They are enabled by the `useSetters` config.

### Triggers

Triggers are momentary switches you can use in your controller automations to start an alarm.

| Trigger | Use                                       |
| ------- | ----------------------------------------- |
| Home    | Triggers the alarm associated with Home.  |
| Away    | Triggers the alarm associated with Away.  |
| Night   | Triggers the alarm associated with Night. |
| 24h     | Triggers the alarm associated with 24h.   |

Triggers will trigger the corresponding alarm and will revert immediately their state.

On your controller you need to create an automation that trigger each trigger.

### Alerts

Alerts are the alarm states exposed by the plugin; they stay active for the configured `alertTimeout` and then reset.

| Alert  | Use                                                |
| ------ | -------------------------------------------------- |
| Home   | Alert state for Home.                              |
| Away   | Alert state for Away.                              |
| Night  | Alert state for Night.                             |
| 24h    | Alert state for 24h.                               |
| Master | General alert state (not tied to a specific mode). |

Mode, setter, trigger and alert configuration links open `/plugins/matterbridge-security?endpoint=<name>` with the endpoint name URL-encoded.

### Event history

The platform's `events` array contains the latest security events, oldest first. Set `eventsNumber` in the plugin configuration to an integer from 100 to 1000 to control how many events are retained (default: 200). Existing configurations without this option default to 200 on startup. History is saved in plugin storage under `SecurityEvents` and restored on startup.

The plugin frontend displays all retained events, oldest first, with color-coded event types and dates formatted for your browser's locale and timezone. Use **Refresh** to load the latest events. Timestamps remain in ISO format in storage and in the plugin's `GET /plugins/matterbridge-security/api/events` response.

When an `endpoint` query parameter is present (for example, `?endpoint=Mode%20Away` or `?endpoint=Trigger%20Away`), the frontend replaces the table with graphs for that exact endpoint. **Compare all** shows a bar timeline and daily totals together; use the view buttons to inspect each separately. Timeline bars mark individual occurrences at their exact timestamps; their width does not represent duration. Hover or focus bars for exact values. Setter graphs show changes to their corresponding mode from any control; setter presses are not recorded separately. Alert Away, Home, Night and 24h graphs use the corresponding accepted trigger events; Alert Master combines all four trigger types. Graphs use retained occurrences only, not inferred active durations; daily totals group events by your local calendar day and omit days without matching events.

Event history requests use the frontend base URL, preserving the Home Assistant Ingress path when accessed through Home Assistant.

Trigger events are displayed as **Alarm** in the frontend (for example, **Alarm Away**). Stored events and the API retain the `trigger` type and original trigger names.

Each entry contains `datetime` (an ISO 8601 UTC timestamp), `event` (the mode or trigger name, `Startup`, or `Shutdown`), and `type` (`mode`, `trigger`, `startup`, or `shutdown`).

- Mode events are recorded only when the mode changes, including changes to Off. Restoring the mode on startup does not add a mode event.
- Trigger events are recorded only when a trigger activates alerts in the current mode. Ignored triggers and automatic alert resets do not add events.
- Startup events are recorded after initialization completes. Shutdown events are saved before plugin storage closes.

```json
{ "datetime": "2026-10-17T17:38:25.632Z", "event": "Mode Away", "type": "mode" }
```

![Image1](./screenshots/image.png)
![image2](./screenshots/image-1.png)

## Development guide

Refer to the Matterbridge [Development guide](https://matterbridge.io/README-DEV.html) for other guidelines.

## Repository toolchain

See [TOOLCHAIN.md](./TOOLCHAIN.md) for compilers, linting, formatting, testing, and editor support.

## Shared agent instructions

See [SHARED-AGENTS.md](./SHARED-AGENTS.md) for shared guidance, rules, skills, and configuration for coding agents.

See [.agents/README.md](./.agents/README.md) for the shared instructions layout and versioning.

## Shared dev container support

See [.devcontainer/README.md](./.devcontainer/README.md) for the shared development container setup and usage.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Style guide

See [STYLEGUIDE.md](./STYLEGUIDE.md) for code style, naming, documentation, and testing conventions.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and notable changes.

## Issues and feature requests

Report bugs and suggest improvements on [GitHub Issues](https://github.com/Luligu/matterbridge-security/issues).

## License

Licensed under the [Apache License 2.0](./LICENSE).

## Support the project

If you find this project useful, please consider giving it a star on [GitHub](https://github.com/Luligu/matterbridge-security) and sponsoring it. Your support helps maintain and improve the project.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/luligugithub)
