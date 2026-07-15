import type { NexusApprovalRiskLevel } from "@/nexus/contracts";

export const NEXUS_APPROVAL_PERMISSIONS = {
  DECIDE: "nexus:approvals:decide",
  EXECUTE: "nexus:approvals:execute",
} as const;

const HIGH_IMPACT_ACTIONS = new Set([
  "plant.start-all",
  "plant.stop-all",
  "plant.load-shed",
  "plant.emergency-shutdown",
  "plant.emergency-ventilation",
  "equipment.physical-control",
  "power.transfer-source",
  "power.start-generator",
  "power.stop-generator",
  "power.open-breaker",
  "power.close-breaker",
]);

export function normalizeNexusAction(action: string): string {
  return action.trim().toLowerCase();
}

export function requiresNexusHumanApproval(action: string): boolean {
  const normalizedAction = normalizeNexusAction(action);

  return (
    HIGH_IMPACT_ACTIONS.has(normalizedAction) ||
    normalizedAction.startsWith("physical-control.") ||
    normalizedAction.startsWith("emergency.") ||
    normalizedAction.startsWith("power.switching.")
  );
}

export function determineNexusActionRisk(
  action: string,
): NexusApprovalRiskLevel {
  const normalizedAction = normalizeNexusAction(action);

  if (
    normalizedAction.includes("emergency") ||
    normalizedAction.includes("shutdown") ||
    normalizedAction.includes("breaker") ||
    normalizedAction.includes("transfer-source")
  ) {
    return "critical";
  }

  if (
    normalizedAction.includes("start-all") ||
    normalizedAction.includes("stop-all") ||
    normalizedAction.includes("load-shed") ||
    normalizedAction.includes("physical-control")
  ) {
    return "high";
  }

  return requiresNexusHumanApproval(action) ? "high" : "medium";
}
