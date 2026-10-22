# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.1] - initial release

The first public version, rebooted as an independent repository from an upstream
plugin and verified end to end on magpie 0.1.1326 (`magpie provider test
cloudflare-workers-ai` → `✓ chat · 309 ms · @cf/meta/llama-3.3-70b-instruct-fp8-fast`).

### Fixed

- Syntax error in the inherited `config()` (unbalanced parentheses) that
  prevented the plugin module from parsing — upstream shipped a non-loadable file.
- `accountId` no longer throws at init: the Account ID is deferred to the sign-in
  prompt (or plugin options), so magpie can actually add the plugin.
- Auth aligned with the magpie-community contract: single `api` method, API token
  collected through a masked `password` prompt, `authorize` answers accepted as a
  bare string or a fields object, `usage(getAuth, provider)` signature.
- The proxy fetch normalizes incoming template-account URLs
  (`accounts/${CLOUDFLARE_ACCOUNT_ID}/…`) onto the signed-in account's base URL,
  fixing `400 No route for that URI` in real magpie runs.

### Added

- Live model catalog from models.dev (28+ models, hourly TTL, cached with
  fallback on refresh failure).
- Daily Neurons allowance window in `magpie quota` (≤10,000/day, resets 00:00
  UTC) with best-effort plan detection.
- `free: true` on every non-paid model (green Free badge in the picker); the 8
  paid-only models flagged `（Paid）`.
- Multi-account support: another sign-in adds an account; magpie fails over.
- Test suite (11 tests, no network) and GitHub Actions CI (Node 22).
- `scripts/sandbox.sh`: magpie in a throwaway HOME.
- Trilingual README (English primary, 简体中文 and 日本語 mirrors).

Security notes: no runtime dependencies; URLs validated (plain HTTP(S), no
embedded credentials, `redirect: "error"`); signing exactly one header (`Bearer`)
plus the two Cloudflare AI Gateway passthrough headers; sign-ins live only in
magpie's own account storage.
