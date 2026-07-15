import { z } from "zod";

export const nexusTwinTypeSchema = z.enum([
  "hvac",
  "power",
  "energy",
  "maintenance",
  "safety",
  "passenger-flow",
  "flight-operations",
]);

export type NexusTwinType = z.infer<typeof nexusTwinTypeSchema>;

export const nexusSeveritySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export type NexusSeverity = z.infer<typeof nexusSeveritySchema>;

export const nexusAssetStatusSchema = z.enum([
  "unknown",
  "online",
  "offline",
  "running",
  "stopped",
  "standby",
  "warning",
  "fault",
  "maintenance",
  "unavailable",
]);

export type NexusAssetStatus = z.infer<typeof nexusAssetStatusSchema>;

export const nexusCriticalitySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export type NexusCriticality = z.infer<typeof nexusCriticalitySchema>;

export const nexusIsoDateTimeSchema = z.string().datetime({
  offset: true,
});

export const nexusMetadataSchema = z.record(z.string(), z.unknown());

export type NexusMetadata = z.infer<typeof nexusMetadataSchema>;
