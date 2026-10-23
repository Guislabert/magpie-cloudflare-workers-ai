# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.2] - merged community review train

Synced back from `magpie-community/plugins` `packages/cloudflare-workers-ai`
(the version actually merged as magpie-community/plugins#326). Contains the
magpie-community review fixes beyond 0.0.1:

### Fixed

- A models.dev outage no longer breaks chat requests: the request path only
  checks the last good catalog (`discovery.current`), never refreshes, and an
  empty catalog simply skips the check.
- Plugin load no longer waits on models.dev; discovery is lazy via
  `forDisplay()`.
- Paid-only models are name-flagged ` (Paid)` via a shared `paidName()` helper;
  the shared 10,000 Neurons/day allowance is not a free badge, so
  `free: true` stays off.
- GUI strings shown to agents are now English throughout.
- `usage()` validates the Account ID as 32 hex chars before calling the API;
  an invalid ID returns the fallback plan instead of a guaranteed 400.
- `registry.json` entry appended in the file's own format (+3/-1).
- README polish: half-width ` (Paid)`, `baseTemplate` default moved out of the
  Options table, npm badge tracks the release train.

### Packaging

- Version badge / table across all three READMEs: `0.0.2`.
- dist branch artifacts: `magpie-community-opencode-cloudflare-workers-ai-auth-0.0.1.tgz`
  and `…-0.0.2.tgz` (magpie users can `magpie plugin add` today; npm first
  publish stays with the community org owner via trusted publishing).

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

## 0.0.2 review fixes (same release train)

- Request path never refreshes the catalog: model existence checks run against
  the last good list only, and a models.dev outage can no longer take chat
  requests down (upstream review finding, reproduced + regression test).
- Plugin init no longer waits on models.dev.
- GUI strings are English; Account ID prompt is `text`; `free` badge dropped by
  design (shared daily Neurons allowance is not a free model); `usage()` returns
  early without an Account ID.
