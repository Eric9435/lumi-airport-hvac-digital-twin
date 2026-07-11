export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  module?: string;
  action?: string;
  requestId?: string;
  equipmentId?: string;
  userId?: string;
  [key: string]: unknown;
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return error;
}

function writeLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: unknown,
): void {
  const record = {
    timestamp: new Date().toISOString(),

    level,

    message,

    context,

    error: error === undefined ? undefined : serializeError(error),
  };

  const output = JSON.stringify(record);

  switch (level) {
    case "error":
      console.error(output);
      break;

    case "warn":
      console.warn(output);
      break;

    case "debug":
      if (
        process.env.LOG_LEVEL === "debug" ||
        process.env.NODE_ENV === "development"
      ) {
        console.debug(output);
      }
      break;

    default:
      console.info(output);
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    writeLog("debug", message, context);
  },

  info(message: string, context?: LogContext) {
    writeLog("info", message, context);
  },

  warn(message: string, context?: LogContext) {
    writeLog("warn", message, context);
  },

  error(message: string, error?: unknown, context?: LogContext) {
    writeLog("error", message, context, error);
  },
};
