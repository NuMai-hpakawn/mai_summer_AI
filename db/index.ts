import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

function getD1() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function ensureDbSchema() {
  const d1 = getD1();
  await d1.batch([
    d1
      .prepare(
        `CREATE TABLE IF NOT EXISTS plan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_name TEXT NOT NULL,
          name_key TEXT NOT NULL,
          readiness INTEGER NOT NULL,
          training_days INTEGER NOT NULL,
          goal TEXT NOT NULL,
          split TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      ),
    d1.prepare(
      `CREATE INDEX IF NOT EXISTS plan_history_name_created_idx
       ON plan_history (name_key, created_at)`,
    ),
  ]);
}
