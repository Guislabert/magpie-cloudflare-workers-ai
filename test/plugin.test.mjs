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

test("missing accountId throws", async () => {
  await assert.rejects(
    async () => CloudflareWorkersAIPlugin({}, { fetchImpl: async () => new Response("{}") }),
    /accountId/
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

test("auth loader rejects non-chat endpoints and unknown models", async () => {
  const plugin = await CloudflareWorkersAIPlugin({}, opts());
  const result = await plugin.auth.loader(async () => ({ methods: [{ key: "tok" }, { key: "" }] }));
  await assert.rejects(
    async () => result.fetch(new Request(`${result.baseURL}/foo`, { method: "POST" }), {}),
    /Unsupported endpoint/
  );
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
});
