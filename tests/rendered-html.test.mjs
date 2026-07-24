import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the fitness planner, history chart, and coach interface", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title: "JUNIOUS — Your Personal Gym Plan"/);
  assert.match(page, /Tell us what your week looks like/);
  assert.match(page, /Used to save and find your plan history/);
  assert.match(page, /03 \/ Your history/);
  assert.match(page, /Save this plan/);
  assert.match(page, /history-bar-track/);
  assert.match(page, /04 \/ Ask the coach/);
  assert.match(page, /Conversation with JUNIOUS Coach/);
  assert.match(page, /How should I warm up before leg day\?/);
  assert.match(page, /General fitness guidance only/);
  assert.doesNotMatch(page, /sk-or-v1-|OPENROUTER_API_KEY/);
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

test("uses server-side D1 persistence for plan history", async () => {
  const [historyRoute, schema, hosting] = await Promise.all([
    readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(historyRoute, /getDb\(\)/);
  assert.match(historyRoute, /\.insert\(planHistory\)/);
  assert.match(historyRoute, /\.where\(eq\(planHistory\.nameKey/);
  assert.match(schema, /sqliteTable\(\s*"plan_history"/);
  assert.match(hosting, /"d1": "DB"/);
});
