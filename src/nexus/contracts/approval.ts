import { z } from "zod";

import {
  nexusIsoDateTimeSchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts/common";

export const nexusApprovalRecordStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
  "executed",
  "failed",
]);

export type NexusApprovalRecordStatus = z.infer<
  typeof nexusApprovalRecordStatusSchema
>;

export const nexusApprovalRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export type NexusApprovalRiskLevel = z.infer<
  typeof nexusApprovalRiskLevelSchema
>;

export const nexusApprovalActorSchema = z.object({
  actorId: z.string().trim().min(1).max(200),
  permissions: z.array(z.string().trim().min(1).max(200)),
});

export type NexusApprovalActor = z.infer<typeof nexusApprovalActorSchema>;

export const nexusApprovalRecordSchema = z
  .object({
    approvalId: z.string().uuid(),
    commandId: z.string().trim().min(1).max(128),
    targetTwin: nexusTwinTypeSchema,
    targetAssetId: z.string().trim().min(1).max(128).optional(),
    action: z.string().trim().min(1).max(160),
    parameters: z.record(z.string(), z.unknown()).default({}),
    reason: z.string().trim().min(1).max(2000),
    riskLevel: nexusApprovalRiskLevelSchema,

    requestedBy: z.string().trim().min(1).max(200),
    requestedAt: nexusIsoDateTimeSchema,
    expiresAt: nexusIsoDateTimeSchema,

    status: nexusApprovalRecordStatusSchema,

    decisionPermission: z.string().trim().min(1).max(200),
    executionPermission: z.string().trim().min(1).max(200),

    decidedBy: z.string().trim().min(1).max(200).optional(),
    decidedAt: nexusIsoDateTimeSchema.optional(),
    decisionComment: z.string().trim().max(2000).optional(),

    executedBy: z.string().trim().min(1).max(200).optional(),
    executedAt: nexusIsoDateTimeSchema.optional(),

    failureReason: z.string().trim().min(1).max(2000).optional(),

    correlationId: z.string().trim().min(1).max(128),
    version: z.number().int().positive(),
  })
  .superRefine((record, context) => {
    const decisionRequired = [
      "approved",
      "rejected",
      "executed",
      "failed",
    ].includes(record.status);

    if (decisionRequired && (!record.decidedBy || !record.decidedAt)) {
      context.addIssue({
        code: "custom",
        message: "A decided approval record requires decidedBy and decidedAt.",
        path: ["status"],
      });
    }

    if (
      record.status === "executed" &&
      (!record.executedBy || !record.executedAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "An executed approval requires executedBy and executedAt.",
        path: ["status"],
      });
    }

    if (record.status === "failed" && !record.failureReason) {
      context.addIssue({
        code: "custom",
        message: "A failed approval requires a failure reason.",
        path: ["failureReason"],
      });
    }
  });

export type NexusApprovalRecord = z.infer<typeof nexusApprovalRecordSchema>;

export const createNexusApprovalRequestSchema = z.object({
  commandId: z.string().trim().min(1).max(128),
  targetTwin: nexusTwinTypeSchema,
  targetAssetId: z.string().trim().min(1).max(128).optional(),
  action: z.string().trim().min(1).max(160),
  parameters: z.record(z.string(), z.unknown()).default({}),
  reason: z.string().trim().min(1).max(2000),
  riskLevel: nexusApprovalRiskLevelSchema,
  requestedBy: z.string().trim().min(1).max(200),
  expiresInSeconds: z.number().int().min(60).max(604_800).default(900),
  decisionPermission: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("nexus:approvals:decide"),
  executionPermission: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("nexus:approvals:execute"),
  correlationId: z.string().trim().min(1).max(128).optional(),
});

export type CreateNexusApprovalRequest = z.input<
  typeof createNexusApprovalRequestSchema
>;
