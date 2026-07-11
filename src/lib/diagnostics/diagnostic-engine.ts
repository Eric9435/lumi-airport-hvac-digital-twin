import { randomUUID } from "node:crypto";

import { HVAC_THRESHOLDS } from "@/lib/constants/thresholds";

import type {
  DiagnosticFinding,
  LumiRecommendation,
  PlantDiagnosticReport,
} from "@/types/diagnostics";

import type { PlantState } from "@/types/hvac";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createFinding(
  input: Omit<DiagnosticFinding, "findingId" | "detectedAt">,
): DiagnosticFinding {
  return {
    findingId: randomUUID(),
    detectedAt: new Date().toISOString(),
    ...input,
  };
}

function createRecommendation(
  input: Omit<LumiRecommendation, "recommendationId" | "createdAt" | "status">,
): LumiRecommendation {
  return {
    recommendationId: randomUUID(),

    createdAt: new Date().toISOString(),

    status: "new",

    ...input,
  };
}

export function analyzePlant(state: PlantState): PlantDiagnosticReport {
  const findings: DiagnosticFinding[] = [];

  const recommendations: LumiRecommendation[] = [];

  for (const chiller of state.chillers) {
    if (
      chiller.status === "running" &&
      chiller.cop > 0 &&
      chiller.cop < HVAC_THRESHOLDS.chiller.minimumCop
    ) {
      findings.push(
        createFinding({
          equipmentId: chiller.id,

          equipmentName: chiller.name,

          zoneId: null,

          category: "performance",

          severity: "warning",

          title: "Low chiller efficiency",

          summary: `${chiller.id} is operating at COP ${chiller.cop}, below the configured minimum COP of ${HVAC_THRESHOLDS.chiller.minimumCop}.`,

          probableCauses: [
            "High condenser-water temperature",
            "Condenser fouling",
            "Reduced chilled-water flow",
            "Compressor efficiency degradation",
          ],

          evidence: [
            `Current COP: ${chiller.cop}`,
            `Condenser leaving temperature: ${chiller.condenserWaterLeavingTempC}°C`,
            `Chilled-water flow: ${chiller.chilledWaterFlowM3h} m³/h`,
          ],

          recommendedActions: [
            "Inspect condenser-water conditions",
            "Compare current flow against design flow",
            "Review compressor loading",
            "Schedule condenser inspection",
          ],

          confidencePercent: 88,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: chiller.id,

          zoneId: null,

          category: "maintenance",

          title: `Inspect ${chiller.id} heat-transfer performance`,

          analysisSummary:
            "Reduced COP indicates that the chiller may be consuming more electrical power than expected for the delivered cooling output.",

          recommendedAction:
            "Inspect condenser approach, chilled-water flow, condenser-water flow and heat-exchanger cleanliness.",

          expectedImpact:
            "Improved chiller COP, reduced plant power and improved cooling stability.",

          estimatedEnergySavingPercent: 6,

          comfortImpact: "improve",

          riskLevel: "medium",

          confidencePercent: 86,

          approvalRequired: false,
        }),
      );
    }

    if (chiller.status === "running" && chiller.loadPercent >= 90) {
      findings.push(
        createFinding({
          equipmentId: chiller.id,

          equipmentName: chiller.name,

          zoneId: null,

          category: "control",

          severity: "warning",

          title: "Chiller operating near maximum load",

          summary: `${chiller.id} is operating at ${chiller.loadPercent}% load.`,

          probableCauses: [
            "High terminal cooling demand",
            "Insufficient running chiller capacity",
            "Abnormal AHU cooling demand",
          ],

          evidence: [
            `Load: ${chiller.loadPercent}%`,
            `Plant expected passengers: ${state.expectedPassengers}`,
          ],

          recommendedActions: [
            "Review available standby chillers",
            "Evaluate automatic chiller staging",
            "Check upcoming flight demand",
          ],

          confidencePercent: 92,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: null,
          zoneId: null,
          category: "control",
          title: "Evaluate additional chiller staging",
          analysisSummary:
            "The current lead chiller is operating close to maximum load.",
          recommendedAction:
            "Start the next available standby chiller if demand remains high for the configured staging delay.",
          expectedImpact:
            "Reduced individual chiller loading and improved plant resilience.",
          estimatedEnergySavingPercent: null,
          comfortImpact: "improve",
          riskLevel: "medium",
          confidencePercent: 90,
          approvalRequired: true,
        }),
      );
    }
  }

  for (const ahu of state.ahus) {
    const airflowPercent =
      ahu.designAirflowCmh > 0
        ? (ahu.airflowCmh / ahu.designAirflowCmh) * 100
        : 0;

    if (
      ahu.status === "running" &&
      airflowPercent < HVAC_THRESHOLDS.ahu.airflowLowPercentOfDesign
    ) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "performance",
          severity: "warning",
          title: "AHU airflow below design target",
          summary: `${ahu.id} is delivering approximately ${airflowPercent.toFixed(1)}% of design airflow.`,
          probableCauses: [
            "Low fan speed command",
            "Dirty air filter",
            "Duct restriction",
            "Damper restriction",
          ],
          evidence: [
            `Current airflow: ${ahu.airflowCmh} CMH`,
            `Design airflow: ${ahu.designAirflowCmh} CMH`,
            `Fan speed: ${ahu.fanSpeedPercent}%`,
            `Filter differential pressure: ${ahu.filterDifferentialPressurePa} Pa`,
          ],
          recommendedActions: [
            "Review fan-speed command",
            "Inspect filter differential pressure",
            "Verify damper position",
            "Inspect duct restrictions",
          ],
          confidencePercent: 90,
        }),
      );
    }

    if (
      ahu.filterDifferentialPressurePa >= HVAC_THRESHOLDS.ahu.filterDpWarningPa
    ) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "maintenance",
          severity:
            ahu.filterDifferentialPressurePa >=
            HVAC_THRESHOLDS.ahu.filterDpCriticalPa
              ? "high"
              : "warning",
          title: "Air-filter restriction detected",
          summary: `${ahu.id} filter differential pressure is ${ahu.filterDifferentialPressurePa} Pa.`,
          probableCauses: [
            "Dust-loaded filter",
            "Improper filter installation",
            "Air-path obstruction",
          ],
          evidence: [
            `Filter differential pressure: ${ahu.filterDifferentialPressurePa} Pa`,
            `Warning threshold: ${HVAC_THRESHOLDS.ahu.filterDpWarningPa} Pa`,
          ],
          recommendedActions: [
            "Inspect filter condition",
            "Replace filter if required",
            "Verify airflow after maintenance",
          ],
          confidencePercent: 95,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: ahu.id,
          zoneId: ahu.zoneId,
          category: "maintenance",
          title: `Inspect ${ahu.id} air filter`,
          analysisSummary:
            "Filter differential pressure has exceeded the configured maintenance threshold.",
          recommendedAction:
            "Create a filter inspection work order and verify post-maintenance airflow.",
          expectedImpact:
            "Improved airflow, lower fan power and improved zone comfort.",
          estimatedEnergySavingPercent: 4,
          comfortImpact: "improve",
          riskLevel:
            ahu.filterDifferentialPressurePa >=
            HVAC_THRESHOLDS.ahu.filterDpCriticalPa
              ? "high"
              : "medium",
          confidencePercent: 95,
          approvalRequired: false,
        }),
      );
    }

    if (ahu.co2Ppm >= HVAC_THRESHOLDS.ahu.co2WarningPpm) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "air-quality",
          severity:
            ahu.co2Ppm >= HVAC_THRESHOLDS.ahu.co2CriticalPpm
              ? "critical"
              : "warning",
          title: "Ventilation demand exceeds current outdoor-air supply",
          summary: `${ahu.zoneName} CO₂ concentration is ${ahu.co2Ppm} ppm.`,
          probableCauses: [
            "High passenger occupancy",
            "Insufficient outdoor-air percentage",
            "Damper restriction",
          ],
          evidence: [
            `CO₂: ${ahu.co2Ppm} ppm`,
            `Occupancy: ${ahu.occupancy}`,
            `Outdoor air: ${ahu.outdoorAirPercent}%`,
          ],
          recommendedActions: [
            "Increase outdoor-air percentage",
            "Inspect outdoor-air damper",
            "Review occupancy forecast",
          ],
          confidencePercent: 91,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: ahu.id,
          zoneId: ahu.zoneId,
          category: "air-quality",
          title: `Increase ventilation for ${ahu.zoneName}`,
          analysisSummary:
            "The current CO₂ level indicates insufficient ventilation relative to occupancy.",
          recommendedAction:
            "Increase outdoor-air damper position within safe humidity and energy limits.",
          expectedImpact: "Improved indoor air quality and passenger comfort.",
          estimatedEnergySavingPercent: null,
          comfortImpact: "improve",
          riskLevel:
            ahu.co2Ppm >= HVAC_THRESHOLDS.ahu.co2CriticalPpm
              ? "high"
              : "medium",
          confidencePercent: 90,
          approvalRequired: true,
        }),
      );
    }
  }

  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;

  const highCount = findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  const warningCount = findings.filter(
    (finding) => finding.severity === "warning",
  ).length;

  const healthPenalty = criticalCount * 25 + highCount * 15 + warningCount * 6;

  const overallHealthScore = clamp(100 - healthPenalty, 0, 100);

  const operatingStatus =
    criticalCount > 0
      ? "critical"
      : highCount > 0
        ? "degraded"
        : warningCount > 0
          ? "attention-required"
          : "healthy";

  return {
    generatedAt: new Date().toISOString(),

    overallHealthScore,

    operatingStatus,

    findings,

    recommendations,
  };
}
