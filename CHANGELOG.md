# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - unreleased

### Changed

- Rebooted as an independent repository with new maintainer (attribution and URLs updated).

### Fixed

- Syntax error in `src/index.mjs` `config()` (unbalanced parentheses) that prevented the plugin module from parsing — upstream shipped the plugin in a non-loadable state.
- Removed stale upstream metadata placeholders and third-party avatar/icon references.

### Added

- Test suite (`node --test`): provider registration & model mapping, account-id validation, model-catalog fallback on refresh failure, auth loader request forwarding, endpoint/model validation.
- `Version / License` documentation section and this changelog.
- Offline smoke-test pass: template URL interpolation, reasoning-variant generation, capability/modality mapping.
