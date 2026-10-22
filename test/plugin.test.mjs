import test from "node:test";
import assert from "node:assert/strict";
import { CloudflareWorkersAIPlugin } from "../index.mjs";

const ACCOUNT_ID = "a".repeat(32);

function fakeCatalog() {
  return {
    "cloudflare-workers-ai": {
      models: {
        "@cf/meta/llama-3-8b-instruct": {
          name: "Llama 3 8B",
          limit: { context: 8192, output: 4096 },
          tool_call: true,
          cost: { input: 0.05, output: 0.12 },
          modalities: { input: ["text"], output: ["text"] },
        },
        "@cf/deepseek/deepseek-r1": {
          name: "DeepSeek R1",
          reasoning: true,
          tool_call: true,
          reasoning_options: [{ type: "effort", values: ["low", "high"] }],
          modalities: { input: ["text", "image"], output: ["text"] },
          interleaved: { field: "reasoning_content" },
          cost: { input: 0.1, output: 0.2 },
        },
      },
    },
  };
}

function opts(catalogJson = fakeCatalog()) {
  return {
    accountId: ACCOUNT_ID,
    discoveryTTLMs: 3600_000,
    fetchImpl: async () => new Response(JSON.stringify(catalogJson)),
  };
}

test("module parses and exports plugin function", async () => {
  const mod = await import("../index.mjs");
  assert.equal(typeof mod.CloudflareWorkersAIPlugin, "function");
  assert.equal(typeof (await import("../index.mjs")).default, "function");
});

test("registers provider with interpolated account id in models.dev-driven config", async () => {
  const plugin = await CloudflareWorkersAIPlugin({}, opts());
  const cfg = {};
  await plugin.config(cfg);
  const p = cfg.provider["cloudflare-workers-ai"];
  assert.ok(p, "provider registered");
  assert.equal(p.api, `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1`);
  assert.equal(p.models["@cf/meta/llama-3-8b-instruct"].name, "Llama 3 8B");
  assert.equal(p.models["@cf/meta/llama-3-8b-instruct"].limit.context, 8192);
  assert.equal(p.models["@cf/deepseek/deepseek-r1"].reasoning, true);
  assert.deepEqual(p.models["@cf/deepseek/deepseek-r1"].variants, {
    low: { reasoningEffort: "low" },
    high: { reasoningEffort: "high" },
  });
});

test("init succeeds without accountId option (no load-time throw)", async () => {
  const noOpts = await CloudflareWorkersAIPlugin({}, { fetchImpl: async () => new Response("{}") });
  const cfg = {};
  await noOpts.config(cfg);
  assert.ok(cfg.provider["cloudflare-workers-ai"], "plugin loads without accountId option");
});

test("loader rejects accounts without a 32-hex accountId", async () => {
  const plugin = await CloudflareWorkersAIPlugin({}, { fetchImpl: async () => new Response("{}") });
  await assert.rejects(
    async () => plugin.auth.loader(async () => ({ key: "tok", metadata: [] })),
    /Account ID/
  );
});

test("discovery falls back to cached catalog on refresh failure", async () => {
  let fail = false;
  const o = {
    accountId: ACCOUNT_ID,
    discoveryTTLMs: 0, // always stale
    fetchImpl: async () => {
      if (fail) return new Response("boom", { status: 500 });
      return new Response(JSON.stringify(fakeCatalog()));
    },
  };
  const plugin = await CloudflareWorkersAIPlugin({}, o);
  const cfg = {};
  await plugin.config(cfg); // primes cache

  fail = true;
  const cfg2 = {};
  await plugin.config(cfg2);
  const p = cfg2.provider["cloudflare-workers-ai"];
  assert.ok(p.models["@cf/meta/llama-3-8b-instruct"], "served cached models after failure");
});

test("auth loader forwards chat/completions with bearer token", async () => {
  let seen = {};
  const o = opts();
  o.fetchImpl = async (url, init) => {
    if (typeof url === "string" && url.includes("models.dev")) {
      return new Response(JSON.stringify(fakeCatalog()));
    }
    seen = { url, init };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const plugin = await CloudflareWorkersAIPlugin({}, o);
  const result = await plugin.auth.loader(async () => ({ methods: [{ key: "tok" }, { key: "" }] }));
  assert.equal(result.baseURL, `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1`);
  assert.equal(result.apiKey, "tok");

  const req = new Request(`${result.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-aig-authorization": "z" },
    body: JSON.stringify({ model: "@cf/meta/llama-3-8b-instruct", messages: [] }),
  });
  const resp = await result.fetch(req, {});
  assert.equal(resp.status, 200);
  assert.equal(seen.init.headers.get("authorization"), "Bearer tok");
  assert.equal(seen.init.headers.get("cf-aig-authorization"), "z");
  assert.match(seen.url, /\/chat\/completions$/);
});

test("auth loader rejects unknown models but passes other endpoints through", async () => {
  const plugin = await CloudflareWorkersAIPlugin({}, opts());
  const result = await plugin.auth.loader(async () => ({ key: "tok", metadata: { accountId: "" } }));
  await assert.rejects(
    async () =>
      result.fetch(
        new Request(`${result.baseURL}/chat/completions`, {
          method: "POST",
          body: JSON.stringify({ model: "@cf/nope" }),
        }),
        {}
      ),
    /absent from the current catalog/
  );
  // Non-chat paths are forwarded untouched to the same base URL
  let forwarded = "";
  const o2 = opts();
  o2.fetchImpl = async (url) => {
    if (typeof url === "string" && url.includes("models.dev")) {
      return new Response(JSON.stringify(fakeCatalog()));
    }
    forwarded = url;
    return new Response("{}", { status: 200 });
  };
  const p2 = await CloudflareWorkersAIPlugin({}, o2);
  const r2 = await p2.auth.loader(async () => ({ key: "tok" }));
  const resp2 = await r2.fetch(`${r2.baseURL}/embeddings`, {
    method: "POST",
    body: JSON.stringify({ text: "x" }),
  });
  assert.equal(resp2.status, 200);
  assert.match(forwarded, /\/embeddings$/);
});

test("authorize returns contract-conform result with metadata accountId", async () => {
  const plugin = await CloudflareWorkersAIPlugin({}, opts());
  const method = plugin.auth.methods[0];
  assert.equal(method.type, "api");
  const ok = await method.authorize(" tok ", { accountId: "b".repeat(32) });
  assert.equal(ok.type, "success");
  assert.equal(ok.key, "tok");
  assert.equal(ok.metadata.accountId, "b".repeat(32));
  const bad = await method.authorize("  ", { accountId: "b".repeat(32) });
  assert.equal(bad.type, "failed");
  const badAcct = method.prompts[0].validate("xyz");
  assert.match(badAcct, /32 位|32/);
});
