# Kinetic Fitness Planner

Kinetic turns a person’s training goal, availability, experience, recovery,
nutrition habits, and daily movement into an explainable weekly gym plan.

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use `npm run build` to validate the production bundle.

## Langfuse tracing

The planner uses Langfuse JS/TS SDK v5 with OpenTelemetry. Each stable plan
calculation creates one `recommend-workout-plan` trace with two child spans:

- `score-readiness`
- `select-weekly-split`

The trace records goal and coarse recovery, nutrition, movement, and
availability bands. It deliberately excludes exact age, weight, height, email,
and API keys. There is no generation observation because the current
recommendation engine is deterministic and makes no LLM call.

Configure these server-side values locally or in the deployment environment:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
LANGFUSE_RELEASE=local
```

Use the base URL for your Langfuse region or self-hosted instance. Never prefix
these names with `NEXT_PUBLIC_`; the secret key must remain server-only. In
serverless environments, the endpoint explicitly flushes completed spans before
the request finishes so traces are not lost.

If credentials are absent or export fails, tracing degrades safely without
interrupting the workout planner.
