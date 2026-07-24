import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the fitness planner and coach", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Kinetic — Your Personal Gym Plan<\/title>/i);
  assert.match(html, /Tell us what your week looks like/);
  assert.match(html, /03 \/ Ask the coach/);
  assert.match(html, /aria-label="Conversation with Kinetic Coach"/);
  assert.match(html, /How should I warm up before leg day\?/);
  assert.match(html, /General fitness guidance only/);
  assert.doesNotMatch(html, /sk-or-v1-|OPENROUTER_API_KEY/);
});

test("keeps OpenRouter credentials on the server", async () => {
  const [page, chatRoute, envExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/chat"/);
  assert.doesNotMatch(page, /OPENROUTER_API_KEY|sk-or-v1-/);
  assert.match(chatRoute, /process\.env\.OPENROUTER_API_KEY/);
  assert.match(
    chatRoute,
    /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/,
  );
  assert.match(chatRoute, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(envExample, /OPENROUTER_API_KEY=sk-or-v1-your-api-key/);
});
