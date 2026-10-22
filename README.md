# magpie-cloudflare-workers-ai

[![CI](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/Guislabert/magpie-cloudflare-workers-ai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@magpie-community/opencode-cloudflare-workers-ai-auth.svg)](https://www.npmjs.com/package/@magpie-community/opencode-cloudflare-workers-ai-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Magpie](https://github.com/magpie-ai/magpie) 的 **Cloudflare Workers AI 供应商插件**。

> 🇬🇧 **English version** → [README.en.md](README.en.md)

## 特性

- 🔧 **模板 URL** — 使用 `${CLOUDFLARE_ACCOUNT_ID}` 占位符，无硬编码账号
- 🔄 **模型自动发现** — 从 [models.dev](https://models.dev) 实时拉取模型目录（默认每小时刷新）
- 🧠 **完整能力映射** — 自动识别推理 / 工具调用 / 多模态 / 交错推理
- 🎛 **推理档位** — 推理模型自动生成 `low`/`medium`/`high` 变体
- 👥 **多账号** — 在登录界面配置多个 Cloudflare 账号
- 🛡 **容错** — 缓存最近一次成功的目录；刷新失败仍保留可用模型
- 🏷 **Free 徽章与付费标注** — 非付费模型带原生 `free: true`（选择页绿色 Free 徽章）；8 个需 Workers Paid / AI Gateway 预充值的模型自动标注 **（Paid）**

## 安装

### 方式一：magpie 插件系统（推荐）

1. 加入 `~/.config/magpie/plugins.json`：

```json
{
  "plugins": [
    ...,
    { "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth" }
  ]
}
```

2. 重启 magpie

3. 打开 magpie → Providers → **Cloudflare Workers AI** → 登录：
   - **API Token**（Cloudflare API Token，需 `Workers AI:Edit` 权限）
   - **Account ID**（登录提示的掩码输入，32 位十六进制；可选，覆盖插件默认值）

### 方式二：npm（本地开发）

```bash
npm install @magpie-community/opencode-cloudflare-workers-ai-auth
```

然后在 plugins.json 中加入：

```json
{ "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth" }
```

## 配置

插件 options：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `accountId` | 默认 Cloudflare Account ID（32 位 hex） | 可选（建议登录时填写） |
| `apiKey` | 默认 API Token | 可选 |
| `baseTemplate` | Base URL 模板 | `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1` |
| `discoveryTTLMs` | 模型目录刷新间隔（ms） | `3600000`（1 小时） |

在 `plugins.json` 里带 options：

```json
{
  "spec": "@magpie-community/opencode-cloudflare-workers-ai-auth",
  "options": {
    "accountId": "your-32-char-account-id",
    "discoveryTTLMs": 1800000
  }
}
```

## 工作原理

1. **启动时**：拉取 `https://models.dev/api.json` → 提取 `cloudflare-workers-ai.models`
2. **构建模型元数据**：映射能力、上下文/输出上限、定价、推理变体，标注付费专属模型
3. **注册 provider**：把 `cloudflare-workers-ai` 加入 magpie 的供应商注册表
4. **登录流程**：单一 `api` 登录方式；可选的 Account ID 走 `password` 型 prompt（存入 `auth.metadata.accountId`）
5. **请求路由**：loader 的 `fetch` 是通用透传代理（保留原始路径与方法），注入 `Bearer` 认证；JSON body 带 `model` 时做目录存在性校验；模板账号 URL 自动归一化到实际账号

## 插件契约

遵循 magpie-community 插件契约（[参考文档](https://usemagpie.ai/docs/plugins)）：

- 单一 async 插件函数，导出 `config`、`auth.methods`、`auth.loader`、`auth.usage`、`provider.models` hooks
- `loader(getAuth, provider)` 按契约账号形态读取（`auth.key`、`auth.metadata.accountId`）；兼容 OpenCode 旧多方法形态
- `authorize(input, inputs)` 返回 `{ type: "success", key, metadata: { accountId? } }` 或 `{ type: "failed", error }`
- `usage(getAuth, provider)`：best-effort 读取套餐（`GET /accounts/{id}`），并展示每日 Neurons 免费额度窗口（≤10,000/天，00:00 UTC 重置）；Cloudflare 无公开的逐账号用量 REST，精确用量见 Dashboard
- 目录拉取失败时 `config()` 降级为空模型列表（不拖垮插件加载），账号级 `provider.models` 随后提供缓存目录
- 单文件、零运行时依赖、ESM（`node >= 20`）

## 已验证

- **magpie 0.1.1326 沙盒**：插件加载、models.dev 实时发现 28 模型、登录流程正常、`magpie provider test` 返回模型回复 **309 ms**（`@cf/meta/llama-3.3-70b-instruct-fp8-fast`）
- `magpie quota` 正常渲染账号行（套餐 best-effort + 每日 Neurons 窗口）
- 官方 `bun scripts/check.mjs cloudflare-workers-ai` → `✓`
- 登录后 28 个模型中 20 个带 `free: true`（付费专属保留标注）

## 支持的模型

自动包含 Cloudflare Workers AI 目录的全部模型，例如：

- `@cf/zai-org/glm-5.3` — 推理、工具调用（**Paid**）
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` — 工具调用
- `@cf/meta/llama-3.2-11b-vision-instruct` — 多模态（视觉）
- `@cf/moonshotai/kimi-k2.7-code` — 推理、工具调用、代码优化（**Paid**）
- `@cf/openai/gpt-oss-120b` — 推理、工具调用
- ……以及 models.dev 后续新增的全部模型

## 开发

```bash
git clone https://github.com/Guislabert/magpie-cloudflare-workers-ai.git
cd magpie-cloudflare-workers-ai

npm run check    # 语法检查 + 测试
npm test         # 仅测试
```

## 发布到 npm

```bash
npm login
npm publish --access public
```

## 版本 / 许可证

| | |
|---|---|
| **版本** | [`0.1.2`](CHANGELOG.md) |
| **许可证** | [MIT](LICENSE) — Copyright (c) 2026 Guislabert |
| **运行时** | Node.js >= 20，仅 ESM |
| **作者** | [@Guislabert](https://github.com/Guislabert) |
| **English** | [README.en.md](README.en.md) |

MIT © [Guislabert](https://github.com/Guislabert)
