import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const planHistory = sqliteTable(
  "plan_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userName: text("user_name").notNull(),
    nameKey: text("name_key").notNull(),
    readiness: integer("readiness").notNull(),
    trainingDays: integer("training_days").notNull(),
    goal: text("goal").notNull(),
    split: text("split").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("plan_history_name_created_idx").on(
      table.nameKey,
      table.createdAt,
    ),
  ],
);
