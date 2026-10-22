# magpie-cloudflare-workers-ai

[![CI](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@magpie-community/opencode-cloudflare-workers-ai-auth.svg)](https://www.npmjs.com/package/@magpie-community/opencode-cloudflare-workers-ai-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Cloudflare Workers AI provider plugin for [Magpie](https://github.com/magpie-ai/magpie).

## Features

- 🔧 **Template URL** — Uses `${CLOUDFLARE_ACCOUNT_ID}` placeholder, no hardcoded account IDs
- 🔄 **Auto model discovery** — Fetches latest models from [models.dev](https://models.dev) API (refreshes hourly by default)
- 🧠 **Full capability mapping** — Automatically detects reasoning, tool calling, multimodal, interleaved reasoning
- 🎛 **Reasoning effort variants** — Auto-generates `low`/`medium`/`high` variants for reasoning models
- 👥 **Multi-account support** — Configure multiple accounts via auth UI
- 🛡 **Fault tolerant** — Caches last successful catalog; failed refresh preserves working models

## Installation

### Via Magpie Plugin System (Recommended)

1. Add to your `~/.config/magpie/plugins.json`:
```json
{
  "plugins": [
    ...,
    { "spec": "file:./node_modules/magpie-cloudflare-workers-ai" }
  ]
}
```

2. Restart Magpie

3. In Magpie UI → Providers → **Cloudflare Workers AI** → Sign in with:
   - **API Token** (Cloudflare API Token with `Workers AI:Edit` permission)
   - **Account ID** — asked through the sign-in prompt (masked field, optional 32-char hex; overrides the plugin default)

### Via npm (for local development)

```bash
npm install @magpie-community/opencode-cloudflare-workers-ai-auth
```

Then add to plugins.json:
```json
{ "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth" }
```

## Configuration

Environment variables / plugin options:

| Option | Description | Default |
|--------|-------------|---------|
| `accountId` | Default Cloudflare Account ID (32-char hex) | *required* |
| `apiKey` | Default API Token | *optional* |
| `baseTemplate` | Base URL template | `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1` |
| `discoveryTTLMs` | Model catalog refresh interval (ms) | `3600000` (1 hour) |

In `plugins.json` with options:
```json
{
  "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth",
  "options": {
    "accountId": "your-32-char-account-id",
    "discoveryTTLMs": 1800000
  }
}
```

## How It Works

1. **On startup**: Fetches `https://models.dev/api.json` → extracts `cloudflare-workers-ai.models`
2. **Builds model metadata**: Maps capabilities, limits, pricing, reasoning variants
3. **Registers provider**: Adds `cloudflare-workers-ai` to Magpie's provider registry
4. **Auth flow**: One `api` sign-in method; the optional Account ID is a `password`-type prompt (`auth.methods[0].prompts`), saved as `auth.metadata.accountId`
5. **Request routing**: The loader's `fetch` is a generic pass-through to the Workers AI base URL (path and method preserved), with `Bearer` auth; for JSON bodies naming a model, the model is verified against the live catalog

## Plugin contract

This plugin follows the magpie-community plugin contract ([reference](https://usemagpie.ai/docs/plugins)):

- Single async plugin function exporting `config`, `auth.methods`, `auth.loader`, `auth.usage` and `provider.models` hooks
- `loader(getAuth, provider)` reads the contract account shape (`auth.key`, `auth.metadata.accountId`); the legacy OpenCode multi-method shape is accepted as a fallback
- `authorize(input, inputs)` returns `{ type: "success", key, metadata: { accountId? } }` or `{ type: "failed", error }`
- `usage(getAuth, provider)` reports an empty window (Workers AI has no per-token allowance endpoint to poll)
- On catalog fetch failure at load, `config()` degrades to an empty model list instead of throwing; per-account `provider.models` serves the cached catalog afterward
- One file, zero runtime dependencies, ESM (`node >= 20`)

## Verified

- **magpie 0.1.1326 sandbox**: plugin loads, 28 models discovered live from models.dev, sign-in flow works, `magpie provider test` returns model reply in 309 ms (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- `magpie quota` renders the account row: best-effort plan detection + free Neurons/day window.

## Supported Models

Automatically includes all models from Cloudflare Workers AI catalog, e.g.:
- `@cf/zai-org/glm-5.3` — Reasoning, tool calling
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` — Tool calling
- `@cf/meta/llama-3.2-11b-vision-instruct` — Multimodal (vision)
- `@cf/moonshotai/kimi-k2.7-code` — Reasoning, tool calling, code optimized
- `@cf/openai/gpt-oss-120b` — Reasoning, tool calling
- ...and all new models as they're added to models.dev

## Development

```bash
# Clone
git clone https://github.com/Guislabert/magpie-cloudflare-workers-ai.git
cd magpie-cloudflare-workers-ai

# Test syntax
npm run check

# Run tests
npm test
```

## Publishing to npm

```bash
# Login first
npm login

# Publish
npm publish --access public
```

## Version / License

| | |
|---|---|
| **Version** | `0.1.0` (see [CHANGELOG.md](CHANGELOG.md)) |
| **License** | [MIT](LICENSE) — Copyright (c) 2026 Guislabert |
| **Runtime** | Node.js >= 20, ESM only |
| **Author** | [@Guislabert](https://github.com/Guislabert) |

## License

MIT © [Guislabert](https://github.com/Guislabert)