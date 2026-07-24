import {
  propagateAttributes,
  startActiveObservation,
} from "@langfuse/tracing";
import { getLangfuseRuntime } from "../../../lib/langfuse";

const goals = ["strength", "muscle", "fat-loss", "general"] as const;
const experiences = ["beginner", "intermediate", "advanced"] as const;
const bands = ["low", "moderate", "high"] as const;

type Goal = (typeof goals)[number];
type Experience = (typeof experiences)[number];
type Band = (typeof bands)[number];

type TracePlanPayload = {
  goal: Goal;
  experience: Experience;
  availabilityBand: "2-3-days" | "4-5-days";
  recoveryBand: Band;
  nutritionBand: Band;
  movementBand: Band;
  recommendation: {
    trainingDays: number;
    split: string;
    readinessBand: Band;
    cardioFocus: "standard" | "fat-loss";
  };
};

function isEnum<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function parsePayload(value: unknown): TracePlanPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<TracePlanPayload>;
  const recommendation = input.recommendation;

  if (
    !isEnum(input.goal, goals) ||
    !isEnum(input.experience, experiences) ||
    !isEnum(input.recoveryBand, bands) ||
    !isEnum(input.nutritionBand, bands) ||
    !isEnum(input.movementBand, bands) ||
    !["2-3-days", "4-5-days"].includes(input.availabilityBand ?? "") ||
    !recommendation ||
    typeof recommendation !== "object" ||
    !Number.isInteger(recommendation.trainingDays) ||
    recommendation.trainingDays < 2 ||
    recommendation.trainingDays > 5 ||
    typeof recommendation.split !== "string" ||
    recommendation.split.length > 80 ||
    !isEnum(recommendation.readinessBand, bands) ||
    !["standard", "fat-loss"].includes(recommendation.cardioFocus)
  ) {
    return null;
  }

  return input as TracePlanPayload;
}

export async function POST(request: Request) {
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) {
    return Response.json({ error: "Invalid trace payload" }, { status: 400 });
  }

  const runtime = getLangfuseRuntime();
  if (!runtime) {
    return Response.json({ traced: false, reason: "not-configured" });
  }

  try {
    await propagateAttributes(
      {
        traceName: "recommend-workout-plan",
        tags: ["fitness-planner", `goal-${payload.goal}`],
        version: "1.1.0",
        metadata: {
          feature: "weekly-plan",
          source: "web",
          privacy: "coarse-bands-only",
        },
      },
      async () => {
        await startActiveObservation(
          "recommend-workout-plan",
          async (root) => {
            root.update({
              input: {
                goal: payload.goal,
                experience: payload.experience,
                availability: payload.availabilityBand,
                recovery: payload.recoveryBand,
                nutrition: payload.nutritionBand,
                movement: payload.movementBand,
              },
            });

            await startActiveObservation("score-readiness", async (span) => {
              span.update({
                input: {
                  recovery: payload.recoveryBand,
                  nutrition: payload.nutritionBand,
                  movement: payload.movementBand,
                },
                output: {
                  readiness: payload.recommendation.readinessBand,
                },
              });
            });

            await startActiveObservation("select-weekly-split", async (span) => {
              span.update({
                input: {
                  goal: payload.goal,
                  experience: payload.experience,
                  availability: payload.availabilityBand,
                },
                output: {
                  trainingDays: payload.recommendation.trainingDays,
                  split: payload.recommendation.split,
                },
              });
            });

            root.update({
              output: {
                trainingDays: payload.recommendation.trainingDays,
                split: payload.recommendation.split,
                readiness: payload.recommendation.readinessBand,
                cardioFocus: payload.recommendation.cardioFocus,
              },
            });
          },
        );
      },
    );

    await runtime.processor.forceFlush();
    return Response.json({ traced: true });
  } catch (error) {
    console.error("Langfuse trace export failed", error);
    return Response.json({ traced: false }, { status: 202 });
  }
}
