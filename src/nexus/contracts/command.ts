import { z } from "zod";

import {
  nexusIsoDateTimeSchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts/common";

export const nexusApprovalStatusSchema = z.enum([
  "not-required",
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export type NexusApprovalStatus = z.infer<typeof nexusApprovalStatusSchema>;

export const nexusExecutionStatusSchema = z.enum([
  "pending",
  "blocked",
  "executing",
  "executed",
  "failed",
  "cancelled",
]);

export type NexusExecutionStatus = z.infer<typeof nexusExecutionStatusSchema>;

export const nexusCommandSchema = z.object({
  commandId: z.string().trim().min(1).max(128),
  targetTwin: nexusTwinTypeSchema,
  targetAssetId: z.string().trim().min(1).max(128).optional(),
  action: z.string().trim().min(1).max(160),
  parameters: z.record(z.string(), z.unknown()).default({}),
  requestedBy: z.string().trim().min(1).max(200),
  requestedAt: nexusIsoDateTimeSchema,
  approvalStatus: nexusApprovalStatusSchema,
  executionStatus: nexusExecutionStatusSchema,
});

export type NexusCommand = z.infer<typeof nexusCommandSchema>;

export const createNexusCommandSchema = nexusCommandSchema.omit({
  commandId: true,
  requestedAt: true,
  approvalStatus: true,
  executionStatus: true,
});

export type CreateNexusCommand = z.input<typeof createNexusCommandSchema>;
