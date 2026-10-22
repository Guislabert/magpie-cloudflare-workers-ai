# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.1] - unreleased

### Fixed

- **Contract conformance** (magpie-community plugin contract, see [usemagpie.ai/docs/plugins](https://usemagpie.ai/docs/plugins)):
  - `auth.loader` now reads the contract account shape (`auth.key`, `auth.metadata.accountId`); the legacy OpenCode multi-method shape is kept as a fallback. Loader signature is `loader(getAuth, provider)`.
  - Removed the non-contract `type: "input"` sign-in method. The optional Account ID is now a masked `password` prompt on the single `api` method, saved via `authorize` as `metadata.accountId`.
  - `auth.usage` now follows the `usage(getAuth, provider)` contract signature.
- `config()` degrades gracefully to an empty model list when the models.dev catalog is unavailable, instead of failing the whole plugin load.
- The loader's `fetch` is now a generic pass-through proxy (original path, method and signal preserved) instead of hard-rejecting anything that is not `/chat/completions`; model-existence validation applies only to JSON bodies naming a model.
- Fix an internal regression caught by the test suite: the request-body wrap no longer swallows model-validation errors.

### Added

- GitHub Actions CI (`.github/workflows/ci.yml`): syntax check + tests on Node 22.
- README "Plugin contract" section and updated sign-in/request-routing documentation.
- New tests: non-chat endpoint pass-through, `authorize` contract-conform result shape.

## [0.1.0] - released

### Changed

- Rebooted as an independent repository with new maintainer (attribution and URLs updated).

### Fixed

- Syntax error in `src/index.mjs` `config()` (unbalanced parentheses) that prevented the plugin module from parsing — upstream shipped the plugin in a non-loadable state.
- Removed stale upstream metadata placeholders and third-party avatar/icon references.

### Added

- Test suite (`node --test`): provider registration & model mapping, account-id validation, model-catalog fallback on refresh failure, auth loader request forwarding, endpoint/model validation.
- `Version / License` documentation section and this changelog.
- Offline smoke-test pass: template URL interpolation, reasoning-variant generation, capability/modality mapping.
