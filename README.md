# magpie-cloudflare-workers-ai

[![npm version](https://img.shields.io/npm/v/magpie-cloudflare-workers-ai.svg)](https://www.npmjs.com/package/magpie-cloudflare-workers-ai)
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
   - **Account ID** (optional, 32-char hex; overrides plugin default)

### Via npm (for local development)

```bash
npm install magpie-cloudflare-workers-ai
```

Then add to plugins.json:
```json
{ "spec": "magpie-cloudflare-workers-ai" }
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
  "spec": "magpie-cloudflare-workers-ai",
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
4. **Auth flow**: User provides API Token (+ optional Account ID override)
5. **Request routing**: Intercepts `/chat/completions`, verifies model exists, forwards to Cloudflare with Bearer auth

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
git clone https://github.com/Grepoch/magpie-cloudflare-workers-ai.git
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

## License

MIT © [Grepoch](https://github.com/Grepoch)