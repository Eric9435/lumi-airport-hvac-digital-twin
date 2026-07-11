import type {
  EquipmentHealthMetric,
  MaintenanceActionType,
  PredictiveMaintenanceItem,
} from "@/types/intelligence";

function probabilityFromHealth(healthScore: number): number {
  if (healthScore >= 90) {
    return 8;
  }

  if (healthScore >= 78) {
    return 22;
  }

  if (healthScore >= 62) {
    return 46;
  }

  if (healthScore >= 40) {
    return 72;
  }

  return 92;
}

function completionDaysFromHealth(healthScore: number): number {
  if (healthScore < 40) {
    return 1;
  }

  if (healthScore < 62) {
    return 3;
  }

  if (healthScore < 78) {
    return 14;
  }

  return 30;
}

function actionTypeFromIssue(issue: string | null): MaintenanceActionType {
  if (!issue) {
    return "monitor";
  }

  const normalized = issue.toLowerCase();

  if (normalized.includes("filter")) {
    return "replace";
  }

  if (normalized.includes("fouling") || normalized.includes("approach")) {
    return "clean";
  }

  if (normalized.includes("sensor") || normalized.includes("calibration")) {
    return "calibrate";
  }

  if (normalized.includes("runtime") || normalized.includes("degradation")) {
    return "overhaul";
  }

  return "inspect";
}

function predictedIssueFromMetric(metric: EquipmentHealthMetric): string {
  if (metric.primaryIssue) {
    return metric.primaryIssue;
  }

  if (metric.runtimePenalty >= 10) {
    return "Age-related performance degradation";
  }

  if (metric.efficiencyScore < 70) {
    return "Efficiency deterioration";
  }

  return "No imminent failure pattern detected";
}

export function generatePredictiveMaintenance(
  equipmentHealth: EquipmentHealthMetric[],
): PredictiveMaintenanceItem[] {
  return equipmentHealth
    .filter((metric) => metric.healthScore < 82 || metric.primaryIssue !== null)
    .map((metric) => {
      const predictedIssue = predictedIssueFromMetric(metric);

      return {
        predictionId: `PM-${metric.equipmentId}-${predictedIssue
          .replaceAll(" ", "-")
          .toUpperCase()}`,

        equipmentId: metric.equipmentId,

        equipmentName: metric.equipmentName,

        riskLevel: metric.riskLevel,

        actionType: actionTypeFromIssue(metric.primaryIssue),

        predictedIssue,

        probabilityPercent: probabilityFromHealth(metric.healthScore),

        remainingUsefulLifeDays: metric.remainingUsefulLifeDays,

        recommendedCompletionDays: completionDaysFromHealth(metric.healthScore),

        supportingEvidence: [
          `Health score: ${metric.healthScore}/100`,
          `Efficiency score: ${metric.efficiencyScore}/100`,
          `Runtime: ${metric.runtimeHours.toFixed(1)} hours`,
          `Performance penalty: ${metric.performancePenalty}`,
          `Alarm penalty: ${metric.alarmPenalty}`,
        ],

        recommendedAction: metric.recommendedAction,

        operationalImpact:
          metric.healthScore < 40
            ? "High probability of service interruption or unacceptable performance."
            : metric.healthScore < 62
              ? "Reduced efficiency, resilience and comfort performance."
              : "Maintenance can be planned before significant operational degradation.",
      };
    })
    .sort((left, right) => right.probabilityPercent - left.probabilityPercent);
}
