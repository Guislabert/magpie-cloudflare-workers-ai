# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Distribution & local notes (unversioned)

Documented decisions and observations that do not change code or the 0.0.2
version train.

### Channels — npm is retired on our side (2026-10-23)

- The plugin already reaches all magpie users via `magpie-community/plugins`
  (PR #326 merged): magpie installs from the official repo's `dist` branch,
  which community CI rebuilds automatically on every merge. Merging is all a
  plugin needs to reach magpie.
- npm publishing in that workflow is run by the magpie-community org itself
  (trusted publishing / NPM_TOKEN) — no npm account is ever needed or
  registered on our side.
- This repo therefore publishes **git-first, npm-never**: the READMEs now list
  `magpie plugin add github:Guislabert/magpie-cloudflare-workers-ai` and local
  path installs as the documented channels. The npm badge was removed.

### Known issue — Cloudflare API error observed locally

- Intermittent `Cloudflare API error` surfaces in magpie while talking to
  Workers AI. Exact request/response text was not archived, so this entry is
  kept as an observation rather than a diagnosis.
- Niceties already in the codebase that cover the likely causes: models.dev
  outages no longer block requests (0.0.2), invalid Account IDs are rejected
  before the call (0.0.2), template-account URLs are normalized onto the
  signed-in account (0.0.1's `400 No route for that URI` fix).
- Practical mitigations until the text is captured: retry the request;
  re-check the token (`Account → Workers AI → Edit`) and the 32-hex Account ID;
  `magpie provider test cloudflare-workers-ai` to reproduce outside a model
  call. If the error text is captured later, file it here verbatim.

## [0.0.3] - provider icon

### Added

- The provider shows Cloudflare's own cloud mark: `package.json`'s
  `magpie.icon` points at the official `https://www.cloudflare.com/favicon.ico`
  (96×96, on Cloudflare's own host). Indexed as a PNG by magpie's content
  sniffing (`internal/provider/icon.go`), so the market's default picture is
  gone without hosting a trademark anywhere else and without a registry
  `icon` key (magpie has no built-in `cloudflare` icon;
  `internal/provider/plugin_icon.go` prefers a plugin's own `magpie.icon`).

No code paths change; `src/` and `test/` are byte-identical to 0.0.2.

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
