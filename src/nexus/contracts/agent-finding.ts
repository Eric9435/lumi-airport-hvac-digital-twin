import { z } from "zod";

import {
  nexusIsoDateTimeSchema,
  nexusSeveritySchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts/common";

export const nexusAgentEvidenceSchema = z.object({
  source: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1000),
  value: z.unknown().optional(),
  timestamp: nexusIsoDateTimeSchema.optional(),
});

export type NexusAgentEvidence = z.infer<typeof nexusAgentEvidenceSchema>;

export const nexusRecommendedActionSchema = z.object({
  actionId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  priority: nexusSeveritySchema,
  requiresHumanApproval: z.boolean(),
  commandAction: z.string().trim().min(1).max(160).optional(),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

export type NexusRecommendedAction = z.infer<
  typeof nexusRecommendedActionSchema
>;

export const nexusAgentFindingSchema = z.object({
  findingId: z.string().trim().min(1).max(128),
  agentId: z.string().trim().min(1).max(128),
  sourceTwin: nexusTwinTypeSchema,
  assetId: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(200),
  explanation: z.string().trim().min(1).max(4000),
  evidence: z.array(nexusAgentEvidenceSchema).default([]),
  confidence: z.number().min(0).max(1),
  severity: nexusSeveritySchema,
  recommendedActions: z.array(nexusRecommendedActionSchema).default([]),
  createdAt: nexusIsoDateTimeSchema,
});

export type NexusAgentFinding = z.infer<typeof nexusAgentFindingSchema>;
