// Cloudflare Workers AI Plugin for Magpie
// Supports template URL with ${CLOUDFLARE_ACCOUNT_ID} placeholder
// Auto-discovers models from models.dev API

const CF_WORKERS_AI_ID = "cloudflare-workers-ai";
const MODELS_DEV_URL = "https://models.dev/api.json";
const CF_API_BASE_TEMPLATE = "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1";
const DEFAULT_DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 hour
const CHAT_SDK = "@ai-sdk/openai-compatible";

function checkedURL(value) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Expected a plain HTTP(S) base URL");
  }
  return url.href.replace(/\/+$/, "");
}

function interpolateTemplate(template, vars) {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? `\${${key}}`);
}

async function fetchModelsDev({ fetchImpl = fetch } = {}) {
  const resp = await fetchImpl(MODELS_DEV_URL, {
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!resp.ok) {
    throw new Error(`models.dev returned HTTP ${resp.status}`);
  }
  return resp.json();
}

function buildModels(catalog, baseURL) {
  const cfSection = catalog["cloudflare-workers-ai"]?.models;
  if (!cfSection || typeof cfSection !== "object") {
    throw new Error("cloudflare-workers-ai section not found in models.dev catalog");
  }
  const result = {};
  for (const [modelId, meta] of Object.entries(cfSection)) {
    const limit = meta.limit ?? {};
    const cost = meta.cost ?? {};
    result[modelId] = {
      id: modelId,
      providerID: CF_WORKERS_AI_ID,
      name: meta.name ?? modelId,
      api: { id: modelId, url: baseURL, npm: CHAT_SDK },
      limit: {
        context: limit.context ?? 32768,
        output: limit.output ?? 4096,
      },
      capabilities: {
        temperature: true,
        reasoning: !!meta.reasoning,
        attachment: (meta.modalities?.input ?? ["text"]).some((m) => m !== "text"),
        toolcall: !!meta.tool_call,
        input: Object.fromEntries((meta.modalities?.input ?? ["text"]).map((m) => [m, true])),
        output: Object.fromEntries((meta.modalities?.output ?? ["text"]).map((m) => [m, true])),
        interleaved: meta.interleaved?.field === "reasoning_content" || false,
      },
      cost: {
        input: cost.input ?? 0,
        output: cost.output ?? 0,
        cache: { read: cost.cache_read ?? 0, write: cost.cache_write ?? 0 },
      },
      variants: meta.reasoning_options
        ? Object.fromEntries(
            meta.reasoning_options
              .filter((o) => o.type === "effort")
              .flatMap((o) => o.values ?? [])
              .map((effort) => [effort, { reasoningEffort: effort }])
          )
        : {},
      status: "active",
      release_date: meta.release_date ?? "",
    };
  }
  return result;
}

function createDiscovery({ load, initial = {}, ttlMs = DEFAULT_DISCOVERY_TTL_MS, now = Date.now }) {
  let current = initial;
  let verifiedAt;
  let pending;

  async function refresh(force = false) {
    if (!force && verifiedAt !== undefined && now() - verifiedAt < ttlMs) return current;
    if (pending) return pending;
    pending = (async () => {
      const next = await load();
      if (!next || typeof next !== "object" || Array.isArray(next))
        throw new Error("Invalid live model catalog");
      current = next;
      verifiedAt = now();
      return current;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  }

  return {
    get verifiedAt() { return verifiedAt; },
    get current() { return current; },
    refresh,
    async forDisplay() {
      try { return await refresh(); }
      catch {
        if (verifiedAt === undefined && !Object.keys(current).length)
          throw new Error("Model discovery failed with no cached list");
        const fallback = { ...current };
        fallback[Symbol.for("magpie.fellBack")] = true;
        return fallback;
      }
    },
    async requireModel(id) {
      const models = await refresh();
      if (!Object.hasOwn(models, id))
        throw new Error(`Model ${JSON.stringify(id)} is absent from the current catalog`);
      return models[id];
    },
  };
}

export async function CloudflareWorkersAIPlugin(_input, options = {}) {
  const accountId = options.accountId ?? "";
  const apiKey = options.apiKey ?? "";
  const baseTemplate = options.baseTemplate ?? CF_API_BASE_TEMPLATE;
  const fetchImpl = options.fetchImpl ?? fetch;
  const discoveryTTL = options.discoveryTTLMs ?? DEFAULT_DISCOVERY_TTL_MS;

  if (!accountId) {
    throw new Error("Cloudflare Workers AI requires accountId (your 32-char Account ID)");
  }

  const baseURL = interpolateTemplate(baseTemplate, { CLOUDFLARE_ACCOUNT_ID: accountId });
  checkedURL(baseURL);

  // Initial static snapshot (from models.dev at plugin build time, or empty)
  let initialModels = {};
  try {
    const catalog = await fetchModelsDev({ fetchImpl });
    initialModels = buildModels(catalog, baseURL);
  } catch (e) {
    console.warn("[magpie-cloudflare-workers-ai] Initial model fetch failed, will retry on demand:", e.message);
  }

  const discovery = createDiscovery({
    initial: initialModels,
    ttlMs: discoveryTTL,
    load: async () => {
      const catalog = await fetchModelsDev({ fetchImpl });
      return buildModels(catalog, baseURL);
    },
  });

  return {
    async config(cfg) {
      cfg.provider ??= {};
      cfg.provider[CF_WORKERS_AI_ID] ??= {
        name: "Cloudflare Workers AI",
        npm: CHAT_SDK,
        api: baseURL,
        models: Object.fromEntries(
          Object.entries(await discovery.forDisplay()).map(([id, m]) => [id, {
            id: m.id,
            name: m.name,
            provider: { npm: m.api.npm, api: m.api.url },
            limit: m.limit,
            reasoning: m.capabilities.reasoning,
            tool_call: m.capabilities.toolcall,
            attachment: m.capabilities.attachment,
            modalities: {
              input: Object.keys(m.capabilities.input).filter((k) => m.capabilities.input[k]),
              output: Object.keys(m.capabilities.output).filter((k) => m.capabilities.output[k]),
            },
            cost: { input: m.cost.input, output: m.cost.output },
            variants: m.variants,
            interleaved: m.capabilities.interleaved,
          }])
        )
      };
    },
    auth: {
      provider: CF_WORKERS_AI_ID,
      maxConcurrency: 3,
      methods: [
        {
          type: "api",
          label: "Cloudflare API Token (Workers AI:Edit 权限)",
          placeholder: "输入 API Token",
          async authorize(input) {
            if (!input || typeof input !== "string") return { type: "error", message: "需要 API Token" };
            return { type: "success", key: input.trim() };
          },
        },
        {
          type: "input",
          label: "Account ID (可选，默认使用插件配置的)",
          placeholder: "32位十六进制 Account ID",
          async authorize(input) {
            if (input && !/^[0-9a-f]{32}$/i.test(input.trim())) {
              return { type: "error", message: "Account ID 必须是 32 位十六进制" };
            }
            return { type: "success", key: input?.trim() ?? "" };
          },
        },
      ],
      async loader(getAuth) {
        const auth = await getAuth();
        if (!auth) return {};

        const apiKey = auth.methods?.[0]?.key ?? "";
        const customAccountId = auth.methods?.[1]?.key ?? "";
        const effectiveAccountId = customAccountId || accountId;
        const effectiveBaseURL = interpolateTemplate(baseTemplate, { CLOUDFLARE_ACCOUNT_ID: effectiveAccountId });

        return {
          baseURL: effectiveBaseURL,
          apiKey,
          async fetch(input, init) {
            const req = new Request(input, init);
            if (!req.url.endsWith("/chat/completions") || req.method !== "POST") {
              throw new Error("Unsupported endpoint or method");
            }
            const body = await req.json();
            if (!body || typeof body !== "object" || !body.model) {
              throw new Error("Expected chat request with model");
            }
            // Verify model exists in current catalog
            await discovery.requireModel(body.model);

            const headers = new Headers({ "content-type": "application/json", "authorization": `Bearer ${apiKey}` });
            // Pass through CF-specific headers
            for (const h of ["cf-aig-authorization", "cf-aig-metadata"]) {
              const v = req.headers.get(h);
              if (v) headers.set(h, v);
            }

            return fetchImpl(`${effectiveBaseURL}/chat/completions`, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
              signal: req.signal,
              redirect: "error",
            });
          },
        };
      },
      async usage() { return { plan: "Cloudflare Workers AI", windows: [] }; },
    },
    provider: {
      id: CF_WORKERS_AI_ID,
      async models(provider, { auth } = {}) {
        if (!auth) return provider.models;
        return (await discovery.forDisplay());
      },
    },
  };
}