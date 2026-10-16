import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let loggerProvider: LoggerProvider | undefined;

if (projectToken && host) {
  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": "payspace-web",
      "deployment.environment.name": process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: new URL("/i/v1/logs", host).toString(),
          headers: {
            Authorization: `Bearer ${projectToken}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  });
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && loggerProvider) {
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}

// This logger is intentionally isolated so existing application logs do not leave the app.
const posthogLogger = loggerProvider?.getLogger("payspace.posthog");

export function emitPostHogLog(body: string, attributes: Record<string, boolean | number | string>) {
  posthogLogger?.emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes,
  });
}

export async function flushPostHogLogs() {
  await loggerProvider?.forceFlush();
}
