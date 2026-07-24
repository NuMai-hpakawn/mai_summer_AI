import {
  propagateAttributes,
  startActiveObservation,
} from "@langfuse/tracing";
import { getLangfuseRuntime } from "../../../lib/langfuse";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

const systemPrompt = `You are Kinetic Coach, a concise and supportive gym assistant.
Answer questions about exercise selection, weekly training schedules, technique,
recovery, and general nutrition habits. Prefer practical steps and short answers.
Do not diagnose injuries or medical conditions. If a user describes severe pain,
chest pain, fainting, breathing difficulty, or another urgent symptom, tell them
to stop training and seek qualified medical help.`;

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    return null;
  }

  const messages: ChatMessage[] = [];
  let totalLength = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Partial<ChatMessage>;
    if (
      !["user", "assistant"].includes(candidate.role ?? "") ||
      typeof candidate.content !== "string"
    ) {
      return null;
    }

    const content = candidate.content.trim();
    if (!content || content.length > 1200) return null;
    totalLength += content.length;
    messages.push({ role: candidate.role as ChatMessage["role"], content });
  }

  if (
    totalLength > 6000 ||
    messages[messages.length - 1]?.role !== "user"
  ) {
    return null;
  }

  return messages;
}

function parseSessionId(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 80 ||
    !/^[a-zA-Z0-9_-]+$/.test(value)
  ) {
    return null;
  }
  return value;
}

async function requestOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const requestedModel = process.env.OPENROUTER_MODEL ?? "openrouter/free";
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kinetic-fitness-plan.workspace-856676.chatgpt.site",
        "X-Title": "Kinetic Fitness Planner",
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.5,
        max_tokens: 450,
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | OpenRouterResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? `OpenRouter returned ${response.status}`,
    );
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }

  return {
    content,
    model: payload?.model ?? requestedModel,
    requestedModel,
    usage: payload?.usage,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    sessionId?: unknown;
  } | null;
  const messages = parseMessages(body?.messages);
  const sessionId = parseSessionId(body?.sessionId);

  if (!messages || !sessionId) {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }

  const latestMessage = messages[messages.length - 1].content;
  const runtime = getLangfuseRuntime();

  try {
    const result = runtime
      ? await propagateAttributes(
          {
            traceName: "answer-fitness-question",
            sessionId,
            tags: ["fitness-chat", "openrouter"],
            version: "1.2.0",
            metadata: {
              feature: "fitness-chat",
              source: "web",
              historyLength: messages.length,
            },
          },
          async () =>
            startActiveObservation(
              "answer-fitness-question",
              async (root) => {
                root.update({ input: latestMessage });

                const completion = await startActiveObservation(
                  "generate-fitness-answer",
                  async (generation) => {
                    const requestedModel =
                      process.env.OPENROUTER_MODEL ?? "openrouter/free";
                    generation.update({
                      input: [
                        { role: "system", content: systemPrompt },
                        ...messages,
                      ],
                      model: requestedModel,
                      metadata: {
                        provider: "openrouter",
                        temperature: 0.5,
                        maxTokens: 450,
                      },
                    });

                    const output = await requestOpenRouter(messages);
                    generation.update({
                      output: {
                        role: "assistant",
                        content: output.content,
                      },
                      model: output.model,
                      usageDetails: {
                        input: output.usage?.prompt_tokens ?? 0,
                        output: output.usage?.completion_tokens ?? 0,
                        total: output.usage?.total_tokens ?? 0,
                      },
                    });
                    return output;
                  },
                  { asType: "generation" },
                );

                root.update({ output: completion.content });
                return completion;
              },
            ),
        )
      : await requestOpenRouter(messages);

    if (runtime) await runtime.processor.forceFlush();

    return Response.json({
      message: result.content,
      model: result.model,
    });
  } catch (error) {
    console.error("Fitness chat request failed", error);
    return Response.json(
      {
        error:
          error instanceof Error && error.message.includes("not configured")
            ? "Chat is not configured yet."
            : "The coach is taking a short break. Please try again.",
      },
      { status: 502 },
    );
  }
}
