import { z } from "zod";

import {
  nexusIsoDateTimeSchema,
  nexusSeveritySchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts/common";

export const nexusEventSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  sourceTwin: nexusTwinTypeSchema,
  assetId: z.string().trim().min(1).max(128).optional(),
  eventType: z.string().trim().min(1).max(160),
  severity: nexusSeveritySchema,
  timestamp: nexusIsoDateTimeSchema,
  correlationId: z.string().trim().min(1).max(128),
  causationId: z.string().trim().min(1).max(128).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  requiresHumanApproval: z.boolean().default(false),
});

export type NexusEvent = z.infer<typeof nexusEventSchema>;

export const publishNexusEventSchema = nexusEventSchema.omit({
  eventId: true,
  timestamp: true,
});

export type PublishNexusEvent = z.input<typeof publishNexusEventSchema>;
