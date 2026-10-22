# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.2] - unreleased

### Verified

- End to end on magpie 0.1.1326: `magpie provider test cloudflare-workers-ai` → `✓ chat · 309 ms · @cf/meta/llama-3.3-70b-instruct-fp8-fast`.

### Added

- `magpie quota` now shows a real row for the account: plan name (best-effort via `GET /accounts/{id}`; falls back to “Workers Free / Paid（需 Dashboard 确认）” — Cloudflare publishes no public REST for per-account Neurons) and the repeatable free-allocation window (≤10,000 Neurons/day, resets daily 00:00 UTC).
- Models Cloudflare gates behind a Workers Paid plan / prepaid AI Gateway credits (kimi-k2.6/2.7-code, glm-5.2/5.3/5.3-flash, deepseek-v4 flash/flash-1017/v4-pro) are flagged `（Paid）` in both `config()` and per-account `provider.models`.


## [0.1.1] - unreleased

