import { z } from "zod";

const serverEnvironmentSchema = z.object({
  GOOGLE_APPS_SCRIPT_URL: z.string().url().optional().or(z.literal("")),

  GOOGLE_APPS_SCRIPT_API_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),

  OPENAI_MODEL: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const serverEnvironment = serverEnvironmentSchema.parse({
  GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL,

  GOOGLE_APPS_SCRIPT_API_KEY: process.env.GOOGLE_APPS_SCRIPT_API_KEY,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  OPENAI_MODEL: process.env.OPENAI_MODEL,

  LOG_LEVEL: process.env.LOG_LEVEL,
});
