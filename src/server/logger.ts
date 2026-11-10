/**
 * [BE-13] OWNER: backend · Structured logger (pino-style JSON) with secret redaction.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordhash",
  "secret",
  "token",
  "session",
  "cookie",
  "authorization",
  "api_key",
  "apikey",
]);

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5) return "[MaxDepth]";
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = redact(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export interface Logger {
  debug(msg: string, context?: Record<string, unknown>): void;
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, err?: Error | unknown, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function createLogger(bindings: Record<string, unknown> = {}): Logger {
  const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  const log = (level: LogLevel, msg: string, context?: Record<string, unknown>, err?: Error | unknown) => {
    if (LEVEL_WEIGHTS[level] < LEVEL_WEIGHTS[minLevel]) return;

    const entry: Record<string, unknown> = {
      level,
      time: new Date().toISOString(),
      msg,
      ...bindings,
    };

    if (context) {
      Object.assign(entry, redact(context));
    }

    if (err) {
      if (err instanceof Error) {
        entry.err = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      } else {
        entry.err = redact(err);
      }
    }

    const json = JSON.stringify(entry);
    if (level === "error") {
      console.error(json);
    } else if (level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  };

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, err, ctx) => log("error", msg, ctx, err),
    child: (extraBindings) => createLogger({ ...bindings, ...extraBindings }),
  };
}

export const logger = createLogger();
