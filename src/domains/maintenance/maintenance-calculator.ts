import {
  maintenanceCostEstimateSchema,
  maintenanceCostResultSchema,
  type MaintenanceCostEstimate,
  type MaintenanceCostResult,
} from "@/domains/maintenance/maintenance-contracts";

export function calculateMaintenanceCost(
  input: MaintenanceCostEstimate,
): MaintenanceCostResult {
  const validated = maintenanceCostEstimateSchema.parse(input);

  const labourCost = validated.labourHours * validated.labourRatePerHour;

  const downtimeCost = validated.downtimeHours * validated.downtimeCostPerHour;

  return maintenanceCostResultSchema.parse({
    labourCost,
    sparePartsCost: validated.sparePartsCost,
    externalServiceCost: validated.externalServiceCost,
    downtimeCost,
    totalEstimatedCost:
      labourCost +
      validated.sparePartsCost +
      validated.externalServiceCost +
      downtimeCost,
    currency: validated.currency,
  });
}

export function calculateMtbfHours(
  operatingHours: number,
  failureCount: number,
): number | null {
  if (!Number.isFinite(operatingHours) || operatingHours < 0) {
    throw new Error("Operating hours must be a finite non-negative number.");
  }

  if (!Number.isInteger(failureCount) || failureCount < 0) {
    throw new Error("Failure count must be a non-negative integer.");
  }

  return failureCount === 0 ? null : operatingHours / failureCount;
}

export function calculateMttrHours(
  totalRepairHours: number,
  repairCount: number,
): number | null {
  if (!Number.isFinite(totalRepairHours) || totalRepairHours < 0) {
    throw new Error("Repair hours must be a finite non-negative number.");
  }

  if (!Number.isInteger(repairCount) || repairCount < 0) {
    throw new Error("Repair count must be a non-negative integer.");
  }

  return repairCount === 0 ? null : totalRepairHours / repairCount;
}
