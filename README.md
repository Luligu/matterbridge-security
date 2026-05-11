# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge security plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge?label=docker%20pulls)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-security/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-security/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-security/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/matterbridge-security)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://prettier.io/)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://eslint.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
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

The plugin requires matterbridge v.3.7.2.

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
