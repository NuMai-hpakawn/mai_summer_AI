import { desc, eq } from "drizzle-orm";
import { ensureDbSchema, getDb } from "../../../db";
import { planHistory } from "../../../db/schema";

const goals = ["strength", "muscle", "fat-loss", "general"] as const;

function parseName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (
    name.length < 2 ||
    name.length > 50 ||
    !/^[\p{L}\p{M} .'-]+$/u.test(name)
  ) {
    return null;
  }
  return { name, key: name.normalize("NFKC").toLocaleLowerCase() };
}

function errorResponse(error: unknown) {
  console.error("Plan history request failed", error);
  return Response.json(
    { error: "Plan history is temporarily unavailable." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const parsedName = parseName(new URL(request.url).searchParams.get("name"));
  if (!parsedName) {
    return Response.json({ error: "Enter a valid name." }, { status: 400 });
  }

  try {
    await ensureDbSchema();
    const history = await getDb()
      .select()
      .from(planHistory)
      .where(eq(planHistory.nameKey, parsedName.key))
      .orderBy(desc(planHistory.createdAt), desc(planHistory.id))
      .limit(5);
    return Response.json({ history });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    name?: unknown;
    readiness?: unknown;
    trainingDays?: unknown;
    goal?: unknown;
    split?: unknown;
  } | null;
  const parsedName = parseName(payload?.name);

  if (
    !parsedName ||
    !Number.isInteger(payload?.readiness) ||
    Number(payload?.readiness) < 0 ||
    Number(payload?.readiness) > 100 ||
    !Number.isInteger(payload?.trainingDays) ||
    Number(payload?.trainingDays) < 2 ||
    Number(payload?.trainingDays) > 5 ||
    typeof payload?.goal !== "string" ||
    !goals.includes(payload.goal as (typeof goals)[number]) ||
    typeof payload?.split !== "string" ||
    !payload.split.trim() ||
    payload.split.length > 120
  ) {
    return Response.json({ error: "Invalid plan history entry." }, { status: 400 });
  }

  try {
    await ensureDbSchema();
    const [entry] = await getDb()
      .insert(planHistory)
      .values({
        userName: parsedName.name,
        nameKey: parsedName.key,
        readiness: Number(payload.readiness),
        trainingDays: Number(payload.trainingDays),
        goal: payload.goal,
        split: payload.split.trim(),
      })
      .returning();
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
