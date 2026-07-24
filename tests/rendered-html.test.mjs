import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the fitness planner, history chart, coach, and languages", async () => {
  const [page, layout, i18n] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/i18n.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title: "JUNIOUS — Your Personal Gym Plan"/);
  assert.match(page, /languageOptions/);
  assert.match(page, /changeLanguage/);
  assert.match(page, /translateTerm/);
  assert.doesNotMatch(page, /\bcopy\.(goal|experience)\b/);
  assert.match(page, /aria-pressed=\{profile\.availableDays === days\}/);
  assert.match(page, /showSavePopup/);
  assert.match(page, /history-bar-track/);
  assert.match(i18n, /English/);
  assert.match(i18n, /한국어/);
  assert.match(i18n, /日本語/);
  assert.match(i18n, /中文/);
  assert.match(i18n, /The latest 5 saved plans/);
  assert.match(i18n, /최근 저장한 계획 5개/);
  assert.doesNotMatch(page, /sk-or-v1-|OPENROUTER_API_KEY/);
});

test("keeps OpenRouter credentials on the server", async () => {
  const [page, chatRoute, envExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/chat"/);
  assert.match(page, /language,/);
  assert.doesNotMatch(page, /OPENROUTER_API_KEY|sk-or-v1-/);
  assert.match(chatRoute, /process\.env\.OPENROUTER_API_KEY/);
  assert.match(
    chatRoute,
    /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/,
  );
  assert.match(chatRoute, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(chatRoute, /Respond in Korean/);
  assert.match(chatRoute, /languageInstructions\[language\]/);
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
  assert.match(historyRoute, /\.limit\(5\)/);
  assert.match(schema, /sqliteTable\(\s*"plan_history"/);
  assert.match(hosting, /"d1": "DB"/);
});
