# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge security plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-security.svg)](https://www.npmjs.com/package/matterbridge-security)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge?label=docker%20pulls)](https://hub.docker.com/r/luligu/matterbridge)
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

The plugin requires matterbridge v.3.10.0.

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

## Style guide

See also the [Style Guide](./STYLEGUIDE.md) for JSDoc, naming, and logging conventions used in this repository.

## Repository toolchain

> **Note:** This repository uses a new toolchain. It replaces the traditional TypeScript / ESLint / Prettier / Jest stack with a faster and lighter setup.

- **No `typescript 6.x` package** — replaced by [TypeScript Native 7.x](https://github.com/microsoft/typescript-go).
- **No ESLint, no Prettier** — replaced by the [oxc](https://oxc.rs) stack: [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for formatting.
- **No Jest** — replaced by [Vitest](https://vitest.dev), which is much faster and natively supports ESM without extra configuration.
- **Far fewer development dependencies** — the number of installed packages drops from **~600** to **~75**. A clean install is much faster.
- **Much faster linting and formatting** — oxlint and oxfmt run in a fraction of the time required by the ESLint / Prettier pipeline.
- **Much faster builds** — tsgo compiles the project in a fraction of the time required by the standard `tsc` build.
- **Editor support** — use the VS Code extensions for tsgo and oxc to get the same experience in the editor.

## Copilot instructions

| File                                                                   | Notes                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `.github/copilot-instructions.md`                                      | Main project instructions — always loaded                                          |
| `.github/instructions/chip-tests/chip-tests.instructions.md`           | CHIP conformance test harness — scoped to CHIP test files                          |
| `.github/instructions/matterbridge/matterbridge.instructions.md`       | Matterbridge endpoint guide — dedicated Copilot instruction file                   |
| `.github/instructions/plugin-frontend/plugin-frontend.instructions.md` | Plugin frontend SPA and custom REST API guide — scoped to frontend and plugin code |
| `.github/instructions/testing/unit-tests.instructions.md`              | Testing standards — scoped to `**/*.test.ts`                                       |

## Claude instructions

| File                                                            | Notes                                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `CLAUDE.md`                                                     | Main project instructions — always loaded                                          |
| `.claude/rules/chip-tests/chip-tests.instructions.md`           | CHIP conformance test harness — scoped to CHIP test files                          |
| `.claude/rules/matterbridge/matterbridge.instructions.md`       | Matterbridge endpoint guide — loaded for all contexts                              |
| `.claude/rules/plugin-frontend/plugin-frontend.instructions.md` | Plugin frontend SPA and custom REST API guide — scoped to frontend and plugin code |
| `.claude/rules/testing/unit-tests.instructions.md`              | Testing standards — scoped to `**/*.test.ts`                                       |

## Codex/Agents instructions

| File                         | Notes                                             |
| ---------------------------- | ------------------------------------------------- |
| `AGENTS.md`                  | Main project instructions                         |
| `.agents/chip-tests.md`      | CHIP conformance test harness                     |
| `.agents/matterbridge.md`    | Matterbridge endpoint guide                       |
| `.agents/plugin-frontend.md` | Plugin frontend SPA and custom REST API guide     |
| `.agents/testing.md`         | Testing and validation expectations               |
| `.codex/config.toml`         | Codex project permissions, approvals, and profile |
| `.codex/rules/default.rules` | Codex command allow, prompt, and deny rules       |

## Development guide

Refer to the Matterbridge [Development guide](https://matterbridge.io/README-DEV.html) for other guidelines.

---
