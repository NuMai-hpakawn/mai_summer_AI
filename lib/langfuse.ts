import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

type LangfuseRuntime = {
  processor: LangfuseSpanProcessor;
  sdk: NodeSDK;
};

const globalRuntime = globalThis as typeof globalThis & {
  __kineticLangfuse?: LangfuseRuntime;
};

function maskSensitiveData(data: string): string {
  return data
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[EMAIL_REDACTED]",
    )
    .replace(/\b(?:pk|sk)-lf-[A-Za-z0-9_-]+\b/g, "[LANGFUSE_KEY_REDACTED]")
    .replace(
      /"(age|weight|height)"\s*:\s*\d+(?:\.\d+)?/gi,
      '"$1":"[REDACTED]"',
    );
}

export function getLangfuseRuntime(): LangfuseRuntime | null {
  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY
  ) {
    return null;
  }

  if (!globalRuntime.__kineticLangfuse) {
    const processor = new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
      environment:
        process.env.LANGFUSE_TRACING_ENVIRONMENT ?? "development",
      release: process.env.LANGFUSE_RELEASE ?? "kinetic-local",
      exportMode: "immediate",
      mediaUploadEnabled: false,
      mask: ({ data }) => maskSensitiveData(data),
    });
    const sdk = new NodeSDK({ spanProcessors: [processor] });
    sdk.start();
    globalRuntime.__kineticLangfuse = { processor, sdk };
  }

  return globalRuntime.__kineticLangfuse;
}
