import { randomUUID } from "node:crypto";

import type {
  DiagnosticFinding,
  MaintenancePriority,
  MaintenanceWorkOrder,
} from "@/types/diagnostics";

function priorityFromSeverity(
  severity: DiagnosticFinding["severity"],
): MaintenancePriority {
  switch (severity) {
    case "critical":
      return "critical";

    case "high":
      return "high";

    case "warning":
      return "medium";

    default:
      return "low";
  }
}

export function createWorkOrderFromFinding(
  finding: DiagnosticFinding,
): MaintenanceWorkOrder {
  return {
    workOrderId: randomUUID(),

    createdAt: new Date().toISOString(),

    equipmentId: finding.equipmentId,

    equipmentName: finding.equipmentName,

    zoneId: finding.zoneId,

    source: "lumi",

    sourceReferenceId: finding.findingId,

    title: finding.title,

    description: `${finding.summary}\n\nRecommended actions:\n${finding.recommendedActions.join("\n")}`,

    priority: priorityFromSeverity(finding.severity),

    assignedTo: null,

    plannedStart: null,

    actualStart: null,

    completedAt: null,

    status: "open",

    inspectionResult: "",

    correctiveAction: "",

    estimatedCost: null,

    actualCost: null,

    remarks: `LUMI confidence: ${finding.confidencePercent}%`,
  };
}
