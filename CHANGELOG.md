<!-- eslint-disable markdown/no-missing-label-refs -->

# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge security plugin changelog

All notable changes to this project will be documented in this file.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-security and sponsoring it.

## [1.0.2] - Dev branch

### Changed

- [package]: Update dependencies.
- [package]: Bump package to `automator` v.3.1.9.
- [package]: Bump `typescript-eslint` to v.8.59.3.
- [package]: Update `scripts`.
- [eslint]: Add `eslint` v.2.0.3 config.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.0.1] - 2026-05-11

### Changed

- [package]: Preliminary compatibility update to `matterbridge 3.8.0`, matter 1.5.1 and matter.js 0.17.0.
- [package]: Update dependencies.
- [package]: Bump package to `automator` v.3.1.8.
- [package]: Bump `node-ansi-logger` to v.3.2.1.
- [package]: Bump `node-persist-manager` to v.2.0.2.
- [package]: Bump `jest` to v.30.4.2.
- [package]: Bump `prettier` to v.3.8.3.
- [package]: Bump `typescript` to v.6.0.3.
- [package]: Bump `eslint` to v.10.3.0.
- [package]: Bump `typescript-eslint` to v.8.59.2.
- [package]: Add Node.js 26 to package `engines` field.
- [package]: Add `.vscode\tasks.json`.
- [package]: Add `.vscode\settings.json`.
- [package]: Add package script `typecheck`.
- [eslint]: Remove `eslint-plugin-promise` (not actively maintained) and add optional @typescript-eslint promise rules.
- [workflows]: Add Node.js 26 to `build.yml` Node matrix and remove Node.js 20.
- [devcontainer]: Add `Claude Code for VS Code extension` to Dev Container.
- [jest]: Add `jest` v.2.0.1 config.
- [eslint]: Add `eslint` v.2.0.2 config.
- [prettier]: Add `prettier` v.2.0.0 config.
- [agent]: Add `.github\copilot-instructions.md` for copilot.
- [agent]: Add `.claude\CLAUDE.md` for claude.
- [agent]: Add agent custom instructions (`testing`) for copilot and claude.
- [agent]: Add agent custom instructions (`matterbridge`) for copilot and claude.
- [devcontainer]: Fix pull of new image.
- [devcontainer]: Update VS Code settings.
- [devcontainer]: Leave matterbridge scripts in the cloned repo.
- [scripts]: Update mb-run script.
- [scripts]: Update package watch script.
- [scripts]: Add prune-releases script.
- [devcontainer]: Update `Dev Container` configuration.
- [devcontainer]: Add `postStartCommand` to the Dev Container configuration.
- [package]: Refactor `build.yml` to use matterbridge dev branch for push and main for pull requests.
- [package]: Add `type checking` script for Jest tests.
- [package]: Update actions versions in workflows.
- [package]: Add `CODE_OF_CONDUCT.md`.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.0.0] - 2026-04-08

### Added

- [setters]: Add setters for presence automations when the controller doesn't allow to lock unlock doors from automations (i.e. Apple Home).

### Changed

- [package]: Update dependencies.
- [package]: Bump package to `automator` v.3.1.5.
- [package]: Bump `eslint` to v.10.2.0.
- [package]: Bump `typescript-eslint` to v.8.58.1.
- [devcontainer]: Fix pull of new image.
- [devcontainer]: Update VS Code settings.
- [devcontainer]: Leave matterbridge scripts in the cloned repo.
- [scripts]: Update mb-run script.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.3] - 2026-04-02

First published release. It requires matterbridge v.3.7.2.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

<!-- Commented out section
## [1.1.2] - 2024-03-08

### Added

- [Feature 1]: Description of the feature.
- [Feature 2]: Description of the feature.

### Changed

- [Feature 3]: Description of the change.
- [Feature 4]: Description of the change.

### Deprecated

- [Feature 5]: Description of the deprecation.

### Removed

- [Feature 6]: Description of the removal.

### Fixed

- [Bug 1]: Description of the bug fix.
- [Bug 2]: Description of the bug fix.

### Security

- [Security 1]: Description of the security improvement.
-->
