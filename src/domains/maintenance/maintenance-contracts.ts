import { z } from "zod";

export const maintenancePrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export type MaintenancePriority = z.infer<typeof maintenancePrioritySchema>;

export const workOrderStatusSchema = z.enum([
  "draft",
  "open",
  "assigned",
  "in-progress",
  "blocked",
  "completed",
  "cancelled",
]);

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const failureModeSchema = z.object({
  failureModeId: z.string().trim().min(1).max(128),
  assetType: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  probableCauses: z.array(z.string().trim().min(1).max(500)),
  recommendedActions: z.array(z.string().trim().min(1).max(500)),
  severity: maintenancePrioritySchema,
});

export type FailureMode = z.infer<typeof failureModeSchema>;

export const maintenanceCostEstimateSchema = z.object({
  labourHours: z.number().nonnegative(),
  labourRatePerHour: z.number().nonnegative(),
  sparePartsCost: z.number().nonnegative(),
  externalServiceCost: z.number().nonnegative(),
  downtimeHours: z.number().nonnegative(),
  downtimeCostPerHour: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(3),
});

export type MaintenanceCostEstimate = z.infer<
  typeof maintenanceCostEstimateSchema
>;

export const maintenanceCostResultSchema = z.object({
  labourCost: z.number().nonnegative(),
  sparePartsCost: z.number().nonnegative(),
  externalServiceCost: z.number().nonnegative(),
  downtimeCost: z.number().nonnegative(),
  totalEstimatedCost: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(3),
});

export type MaintenanceCostResult = z.infer<typeof maintenanceCostResultSchema>;

export const maintenanceWorkOrderSchema = z.object({
  workOrderId: z.string().trim().min(1).max(128),
  assetId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  priority: maintenancePrioritySchema,
  status: workOrderStatusSchema,
  assignedTo: z.string().trim().min(1).max(200).optional(),
  failureModeId: z.string().trim().min(1).max(128).optional(),
  estimatedCost: maintenanceCostEstimateSchema.optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  dueAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
});

export type MaintenanceWorkOrder = z.infer<typeof maintenanceWorkOrderSchema>;
