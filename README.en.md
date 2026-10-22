# magpie-cloudflare-workers-ai

[![CI](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@magpie-community/opencode-cloudflare-workers-ai-auth.svg)](https://www.npmjs.com/package/@magpie-community/opencode-cloudflare-workers-ai-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Cloudflare Workers AI provider plugin** for [Magpie](https://github.com/magpie-ai/magpie).

> 🇨🇳 **中文版** → [README.md](README.md)

## Features

- 🔧 **Template URL** — `${CLOUDFLARE_ACCOUNT_ID}` placeholder, no hardcoded account IDs
- 🔄 **Auto model discovery** — live catalog from [models.dev](https://models.dev) (refreshes hourly by default)
- 🧠 **Full capability mapping** — reasoning / tool calling / multimodal / interleaved reasoning
- 🎛 **Reasoning effort variants** — auto `low`/`medium`/`high` for reasoning models
- 👥 **Multi-account** — several Cloudflare accounts via the sign-in UI
- 🛡 **Fault tolerant** — caches the last successful catalog; a failed refresh keeps working models
- 🏷 **Free badge & paid flags** — non-paid models carry the native `free: true` (green Free badge in magpie's picker); the 8 models requiring Workers Paid / AI Gateway credits are flagged **（Paid）**

## Installation

### Via the magpie plugin system (recommended)

1. Add to `~/.config/magpie/plugins.json`:

```json
{
  "plugins": [
    ...,
    { "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth" }
  ]
}
```

2. Restart magpie

3. In magpie → Providers → **Cloudflare Workers AI** → sign in with:
   - **API Token** (Cloudflare API Token with `Workers AI:Edit` permission)
   - **Account ID** (masked sign-in prompt, 32-char hex, optional; overrides the plugin default)

### Via npm (local development)

```bash
npm install @magpie-community/opencode-cloudflare-workers-ai-auth
```

then add to `plugins.json`:

```json
{ "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth" }
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `accountId` | Default Cloudflare Account ID (32-char hex) | optional (set it at sign-in) |
| `apiKey` | Default API Token | optional |
| `baseTemplate` | Base URL template | `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1` |
| `discoveryTTLMs` | Catalog refresh interval (ms) | `3600000` (1 hour) |

With options in `plugins.json`:

```json
{
  "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth",
  "options": {
    "accountId": "your-32-char-account-id",
    "discoveryTTLMs": 1800000
  }
}
```

## How it works

1. **On startup**: fetches `https://models.dev/api.json` → extracts `cloudflare-workers-ai.models`
2. **Builds model metadata**: capabilities, context/output limits, pricing, reasoning variants; flags paid-only models
3. **Registers provider**: adds `cloudflare-workers-ai` to magpie's provider registry
4. **Sign-in flow**: one `api` method; the optional Account ID is a `password`-type prompt saved as `auth.metadata.accountId`
5. **Request routing**: the loader's `fetch` is a generic pass-through proxy (path and method preserved) with `Bearer` auth; JSON bodies naming a `model` are validated against the live catalog; template account URLs are normalized onto the signed-in account

## Plugin contract

This plugin follows the magpie-community plugin contract ([reference](https://usemagpie.ai/docs/plugins)):

- A single async plugin function exporting `config`, `auth.methods`, `auth.loader`, `auth.usage` and `provider.models`
- `loader(getAuth, provider)` reads the contract account shape (`auth.key`, `auth.metadata.accountId`); the legacy OpenCode multi-method shape is accepted as a fallback
- `authorize(input, inputs)` returns `{ type: "success", key, metadata: { accountId? } }` or `{ type: "failed", error }`
- `usage(getAuth, provider)`: best-effort plan detection via `GET /accounts/{id}`, plus the daily Neurons allowance window (≤10,000/day, resets 00:00 UTC). Cloudflare publishes no per-account usage REST; exact numbers are on the dashboard
- On catalog failure at load, `config()` degrades to an empty model list; per-account `provider.models` serves the cached catalog afterward
- One file, zero runtime dependencies, ESM (`node >= 20`)

## Verified

- **magpie 0.1.1326 sandbox**: plugin loads, 28 models discovered live from models.dev, sign-in works, `magpie provider test` returned the model reply in **309 ms** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)
- `magpie quota` renders the account row (best-effort plan + Neurons/day window)
- Official `bun scripts/check.mjs cloudflare-workers-ai` → `✓`
- 20 of 28 models carry `free: true` once signed in; paid-only models keep their flag

## Supported models

The full Cloudflare Workers AI catalog, e.g.:

- `@cf/zai-org/glm-5.3` — reasoning, tool calling (**Paid**)
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` — tool calling
- `@cf/meta/llama-3.2-11b-vision-instruct` — multimodal (vision)
- `@cf/moonshotai/kimi-k2.7-code` — reasoning, tool calling, code-optimized (**Paid**)
- `@cf/openai/gpt-oss-120b` — reasoning, tool calling
- …and every new model models.dev adds

## Development

```bash
git clone https://github.com/Guislabert/magpie-cloudflare-workers-ai.git
cd magpie-cloudflare-workers-ai

npm run check    # syntax + tests
npm test         # tests only
```

## Publishing to npm

```bash
npm login
npm publish --access public
```

## Version / license

| | |
|---|---|
| **Version** | [`0.1.2`](CHANGELOG.md) |
| **License** | [MIT](LICENSE) — Copyright (c) 2026 Guislabert |
| **Runtime** | Node.js >= 20, ESM only |
| **Author** | [@Guislabert](https://github.com/Guislabert) |
| **中文** | [README.md](README.md) |

MIT © [Guislabert](https://github.com/Guislabert)
