#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"
SCRIPT_NAME="11-executive-intelligence-and-predictive-maintenance.sh"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 11 FAILED"
  echo "Script: ${SCRIPT_NAME}"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

required_files=(
  "package.json"
  "tsconfig.json"
  "src/types/hvac.ts"
  "src/types/analytics.ts"
  "src/lib/simulation/initial-state.ts"
  "src/store/simulation-store.ts"
  "src/components/dashboard/plant-dashboard.tsx"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "ERROR: Required file was not found: ${file}" >&2
    exit 1
  fi
done

echo "============================================================"
echo "PART 11 — EXECUTIVE INTELLIGENCE AND PREDICTIVE MAINTENANCE"
echo "============================================================"

mkdir -p \
  src/types \
  src/lib/intelligence \
  src/app/api/intelligence/summary \
  src/app/api/intelligence/predictive-maintenance \
  src/components/intelligence \
  tests/unit \
  docs/intelligence

echo "Creating intelligence domain types..."

cat > src/types/intelligence.ts <<'EOF'
export type AssetHealthStatus =
  | "excellent"
  | "good"
  | "attention-required"
  | "degraded"
  | "critical";

export type MaintenanceRisk =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type MaintenanceActionType =
  | "inspect"
  | "clean"
  | "calibrate"
  | "replace"
  | "monitor"
  | "overhaul";

export interface EquipmentHealthMetric {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  healthScore: number;
  healthStatus: AssetHealthStatus;
  riskLevel: MaintenanceRisk;
  remainingUsefulLifeDays: number | null;
  runtimeHours: number;
  availabilityPercent: number;
  efficiencyScore: number;
  alarmPenalty: number;
  runtimePenalty: number;
  performancePenalty: number;
  primaryIssue: string | null;
  recommendedAction: string;
}

export interface PredictiveMaintenanceItem {
  predictionId: string;
  equipmentId: string;
  equipmentName: string;
  riskLevel: MaintenanceRisk;
  actionType: MaintenanceActionType;
  predictedIssue: string;
  probabilityPercent: number;
  remainingUsefulLifeDays: number | null;
  recommendedCompletionDays: number;
  supportingEvidence: string[];
  recommendedAction: string;
  operationalImpact: string;
}

export interface ReliabilityMetrics {
  totalAssets: number;
  availableAssets: number;
  unavailableAssets: number;
  availabilityPercent: number;
  estimatedMtbfHours: number;
  estimatedMttrHours: number;
  alarmRatePerAsset: number;
  maintenanceRiskAssets: number;
}

export interface ExecutiveKpiSummary {
  generatedAt: string;
  plantPerformanceScore: number;
  assetPerformanceIndex: number;
  energyEfficiencyScore: number;
  reliabilityScore: number;
  comfortScore: number;
  indoorAirQualityScore: number;
  sustainabilityScore: number;
  averageChillerCop: number;
  runningChillers: number;
  activeAhus: number;
  totalPlantPowerKw: number;
  totalEnergyKwh: number;
  expectedPassengers: number;
  activeAlarmCount: number;
  criticalAssetCount: number;
  warningAssetCount: number;
  predictedMaintenanceCount: number;
  estimatedEnergySavingPercent: number;
  estimatedCarbonKg: number;
  reliability: ReliabilityMetrics;
  equipmentHealth: EquipmentHealthMetric[];
  predictiveMaintenance: PredictiveMaintenanceItem[];
  executiveSummary: string;
  priorityActions: string[];
}
EOF

echo "Creating equipment health scoring engine..."

cat > src/lib/intelligence/health-engine.ts <<'EOF'
import type {
  EquipmentHealthMetric,
  AssetHealthStatus,
  MaintenanceRisk,
} from "@/types/intelligence";

import type {
  AhuState,
  ChillerState,
  CoolingTowerState,
  PumpState,
} from "@/types/hvac";

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function round(
  value: number,
  decimalPlaces = 2,
): number {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(value * factor) /
    factor
  );
}

function healthStatusFromScore(
  score: number,
): AssetHealthStatus {
  if (score >= 90) {
    return "excellent";
  }

  if (score >= 78) {
    return "good";
  }

  if (score >= 62) {
    return "attention-required";
  }

  if (score >= 40) {
    return "degraded";
  }

  return "critical";
}

function riskFromScore(
  score: number,
): MaintenanceRisk {
  if (score >= 80) {
    return "low";
  }

  if (score >= 65) {
    return "medium";
  }

  if (score >= 45) {
    return "high";
  }

  return "critical";
}

function estimateRemainingUsefulLifeDays(
  score: number,
  runtimeHours: number,
): number | null {
  if (score >= 92) {
    return null;
  }

  const scoreFactor =
    clamp(score / 100, 0.1, 1);

  const runtimeFactor =
    clamp(
      1 - runtimeHours / 60000,
      0.15,
      1,
    );

  return Math.max(
    7,
    Math.round(
      730 *
        scoreFactor *
        runtimeFactor,
    ),
  );
}

function calculateRuntimePenalty(
  runtimeHours: number,
): number {
  if (runtimeHours <= 5000) {
    return 0;
  }

  return clamp(
    (runtimeHours - 5000) /
      2500,
    0,
    16,
  );
}

function calculateAlarmPenalty(
  alarmLevel:
    | "normal"
    | "information"
    | "warning"
    | "high"
    | "critical",
): number {
  switch (alarmLevel) {
    case "critical":
      return 35;

    case "high":
      return 24;

    case "warning":
      return 12;

    case "information":
      return 4;

    default:
      return 0;
  }
}

export function calculateChillerHealth(
  chiller: ChillerState,
): EquipmentHealthMetric {
  const runtimePenalty =
    calculateRuntimePenalty(
      chiller.runtimeHours,
    );

  const alarmPenalty =
    calculateAlarmPenalty(
      chiller.alarmLevel,
    );

  const copPenalty =
    chiller.status === "running" &&
    chiller.cop > 0 &&
    chiller.cop < 4.5
      ? clamp(
          (4.5 - chiller.cop) * 12,
          0,
          22,
        )
      : 0;

  const temperaturePenalty =
    chiller.status === "running" &&
    chiller.chilledWaterSupplyTempC > 8
      ? clamp(
          (
            chiller.chilledWaterSupplyTempC -
            8
          ) * 7,
          0,
          18,
        )
      : 0;

  const loadPenalty =
    chiller.loadPercent > 92
      ? clamp(
          (
            chiller.loadPercent -
            92
          ) * 1.2,
          0,
          10,
        )
      : 0;

  const performancePenalty =
    copPenalty +
    temperaturePenalty +
    loadPenalty;

  const healthScore =
    round(
      clamp(
        100 -
          runtimePenalty -
          alarmPenalty -
          performancePenalty,
        0,
        100,
      ),
    );

  const efficiencyScore =
    chiller.cop > 0
      ? round(
          clamp(
            (
              chiller.cop /
              5.2
            ) *
              100,
            0,
            100,
          ),
        )
      : chiller.status === "running"
        ? 0
        : 100;

  let primaryIssue:
    string | null = null;

  let recommendedAction =
    "Continue normal monitoring.";

  if (chiller.alarmLevel !== "normal") {
    primaryIssue =
      chiller.alarmCode ??
      "Active chiller alarm";

    recommendedAction =
      "Review active alarm, operating interlocks and current plant conditions.";
  } else if (
    chiller.status === "running" &&
    chiller.cop > 0 &&
    chiller.cop < 4
  ) {
    primaryIssue =
      "Low coefficient of performance";

    recommendedAction =
      "Inspect condenser-water temperature, evaporator flow and heat-exchanger cleanliness.";
  } else if (
    chiller.chilledWaterSupplyTempC > 8.5
  ) {
    primaryIssue =
      "High chilled-water supply temperature";

    recommendedAction =
      "Check available cooling capacity, chilled-water flow and chiller staging.";
  } else if (
    chiller.runtimeHours > 12000
  ) {
    primaryIssue =
      "High accumulated runtime";

    recommendedAction =
      "Schedule a detailed chiller condition inspection and review preventive-maintenance history.";
  }

  return {
    equipmentId:
      chiller.id,

    equipmentName:
      chiller.name,

    equipmentType:
      chiller.equipmentType,

    healthScore,

    healthStatus:
      healthStatusFromScore(
        healthScore,
      ),

    riskLevel:
      riskFromScore(
        healthScore,
      ),

    remainingUsefulLifeDays:
      estimateRemainingUsefulLifeDays(
        healthScore,
        chiller.runtimeHours,
      ),

    runtimeHours:
      chiller.runtimeHours,

    availabilityPercent:
      chiller.status === "offline" ||
      chiller.status === "alarm"
        ? 0
        : 100,

    efficiencyScore,

    alarmPenalty:
      round(alarmPenalty),

    runtimePenalty:
      round(runtimePenalty),

    performancePenalty:
      round(performancePenalty),

    primaryIssue,

    recommendedAction,
  };
}

export function calculateAhuHealth(
  ahu: AhuState,
): EquipmentHealthMetric {
  const runtimePenalty =
    calculateRuntimePenalty(
      ahu.runtimeHours,
    );

  const alarmPenalty =
    calculateAlarmPenalty(
      ahu.alarmLevel,
    );

  const airflowRatio =
    ahu.designAirflowCmh > 0
      ? ahu.airflowCmh /
        ahu.designAirflowCmh
      : 0;

  const airflowPenalty =
    ahu.status === "running" &&
    airflowRatio < 0.78
      ? clamp(
          (
            0.78 -
            airflowRatio
          ) *
            70,
          0,
          20,
        )
      : 0;

  const filterPenalty =
    ahu.filterDifferentialPressurePa > 180
      ? clamp(
          (
            ahu.filterDifferentialPressurePa -
            180
          ) /
            6,
          0,
          22,
        )
      : 0;

  const comfortPenalty =
    Math.abs(
      ahu.zoneTempC -
        ahu.setpointC,
    ) > 2
      ? clamp(
          (
            Math.abs(
              ahu.zoneTempC -
                ahu.setpointC,
            ) -
            2
          ) *
            5,
          0,
          16,
        )
      : 0;

  const airQualityPenalty =
    ahu.co2Ppm > 1000
      ? clamp(
          (
            ahu.co2Ppm -
            1000
          ) /
            35,
          0,
          20,
        )
      : 0;

  const performancePenalty =
    airflowPenalty +
    filterPenalty +
    comfortPenalty +
    airQualityPenalty;

  const healthScore =
    round(
      clamp(
        100 -
          runtimePenalty -
          alarmPenalty -
          performancePenalty,
        0,
        100,
      ),
    );

  const efficiencyScore =
    round(
      clamp(
        100 -
          filterPenalty -
          airflowPenalty,
        0,
        100,
      ),
    );

  let primaryIssue:
    string | null = null;

  let recommendedAction =
    "Continue normal monitoring.";

  if (
    ahu.filterDifferentialPressurePa >=
    250
  ) {
    primaryIssue =
      "Critical filter restriction";

    recommendedAction =
      "Inspect and replace the air filter, then verify airflow and differential pressure.";
  } else if (
    ahu.filterDifferentialPressurePa >=
    180
  ) {
    primaryIssue =
      "High filter differential pressure";

    recommendedAction =
      "Schedule filter inspection and confirm post-maintenance airflow.";
  } else if (
    ahu.co2Ppm >= 1000
  ) {
    primaryIssue =
      "Insufficient ventilation";

    recommendedAction =
      "Review occupancy and increase outdoor-air supply within operating limits.";
  } else if (
    airflowRatio < 0.78 &&
    ahu.status === "running"
  ) {
    primaryIssue =
      "Low airflow performance";

    recommendedAction =
      "Inspect fan speed, damper position, filter condition and duct restrictions.";
  }

  return {
    equipmentId:
      ahu.id,

    equipmentName:
      ahu.name,

    equipmentType:
      ahu.equipmentType,

    healthScore,

    healthStatus:
      healthStatusFromScore(
        healthScore,
      ),

    riskLevel:
      riskFromScore(
        healthScore,
      ),

    remainingUsefulLifeDays:
      estimateRemainingUsefulLifeDays(
        healthScore,
        ahu.runtimeHours,
      ),

    runtimeHours:
      ahu.runtimeHours,

    availabilityPercent:
      ahu.status === "offline" ||
      ahu.status === "alarm"
        ? 0
        : 100,

    efficiencyScore,

    alarmPenalty:
      round(alarmPenalty),

    runtimePenalty:
      round(runtimePenalty),

    performancePenalty:
      round(performancePenalty),

    primaryIssue,

    recommendedAction,
  };
}

export function calculatePumpHealth(
  pump: PumpState,
): EquipmentHealthMetric {
  const runtimePenalty =
    calculateRuntimePenalty(
      pump.runtimeHours,
    );

  const alarmPenalty =
    calculateAlarmPenalty(
      pump.alarmLevel,
    );

  const flowRatio =
    pump.designFlowM3h > 0
      ? pump.flowM3h /
        pump.designFlowM3h
      : 0;

  const flowPenalty =
    pump.status === "running" &&
    flowRatio < 0.7
      ? clamp(
          (
            0.7 -
            flowRatio
          ) *
            60,
          0,
          22,
        )
      : 0;

  const pressurePenalty =
    pump.differentialPressureBar > 4
      ? clamp(
          (
            pump.differentialPressureBar -
            4
          ) *
            5,
          0,
          16,
        )
      : 0;

  const performancePenalty =
    flowPenalty +
    pressurePenalty;

  const healthScore =
    round(
      clamp(
        100 -
          runtimePenalty -
          alarmPenalty -
          performancePenalty,
        0,
        100,
      ),
    );

  return {
    equipmentId:
      pump.id,

    equipmentName:
      pump.name,

    equipmentType:
      pump.equipmentType,

    healthScore,

    healthStatus:
      healthStatusFromScore(
        healthScore,
      ),

    riskLevel:
      riskFromScore(
        healthScore,
      ),

    remainingUsefulLifeDays:
      estimateRemainingUsefulLifeDays(
        healthScore,
        pump.runtimeHours,
      ),

    runtimeHours:
      pump.runtimeHours,

    availabilityPercent:
      pump.status === "offline" ||
      pump.status === "alarm"
        ? 0
        : 100,

    efficiencyScore:
      round(
        clamp(
          flowRatio * 100,
          0,
          100,
        ),
      ),

    alarmPenalty:
      round(alarmPenalty),

    runtimePenalty:
      round(runtimePenalty),

    performancePenalty:
      round(performancePenalty),

    primaryIssue:
      flowPenalty > 0
        ? "Low pump flow"
        : pressurePenalty > 0
          ? "Abnormal differential pressure"
          : null,

    recommendedAction:
      flowPenalty > 0
        ? "Inspect pump speed, valve position, strainers and hydraulic restrictions."
        : pressurePenalty > 0
          ? "Review pump head, valve positions and system differential-pressure control."
          : "Continue normal monitoring.",
  };
}

export function calculateCoolingTowerHealth(
  tower: CoolingTowerState,
): EquipmentHealthMetric {
  const runtimePenalty =
    calculateRuntimePenalty(
      tower.runtimeHours,
    );

  const alarmPenalty =
    calculateAlarmPenalty(
      tower.alarmLevel,
    );

  const approachPenalty =
    tower.status === "running" &&
    tower.approachC > 6
      ? clamp(
          (
            tower.approachC -
            6
          ) *
            6,
          0,
          22,
        )
      : 0;

  const leavingTemperaturePenalty =
    tower.status === "running" &&
    tower.leavingWaterTempC > 33
      ? clamp(
          (
            tower.leavingWaterTempC -
            33
          ) *
            4,
          0,
          16,
        )
      : 0;

  const performancePenalty =
    approachPenalty +
    leavingTemperaturePenalty;

  const healthScore =
    round(
      clamp(
        100 -
          runtimePenalty -
          alarmPenalty -
          performancePenalty,
        0,
        100,
      ),
    );

  return {
    equipmentId:
      tower.id,

    equipmentName:
      tower.name,

    equipmentType:
      tower.equipmentType,

    healthScore,

    healthStatus:
      healthStatusFromScore(
        healthScore,
      ),

    riskLevel:
      riskFromScore(
        healthScore,
      ),

    remainingUsefulLifeDays:
      estimateRemainingUsefulLifeDays(
        healthScore,
        tower.runtimeHours,
      ),

    runtimeHours:
      tower.runtimeHours,

    availabilityPercent:
      tower.status === "offline" ||
      tower.status === "alarm"
        ? 0
        : 100,

    efficiencyScore:
      round(
        clamp(
          100 -
            approachPenalty -
            leavingTemperaturePenalty,
          0,
          100,
        ),
      ),

    alarmPenalty:
      round(alarmPenalty),

    runtimePenalty:
      round(runtimePenalty),

    performancePenalty:
      round(performancePenalty),

    primaryIssue:
      approachPenalty > 0
        ? "High cooling-tower approach"
        : leavingTemperaturePenalty > 0
          ? "High condenser-water leaving temperature"
          : null,

    recommendedAction:
      approachPenalty > 0
        ? "Inspect fill condition, fan operation, water distribution and ambient wet-bulb conditions."
        : leavingTemperaturePenalty > 0
          ? "Review cooling-tower fan speed, condenser-water flow and tower cleanliness."
          : "Continue normal monitoring.",
  };
}
EOF

echo "Creating predictive maintenance engine..."

cat > src/lib/intelligence/predictive-maintenance.ts <<'EOF'
import type {
  EquipmentHealthMetric,
  MaintenanceActionType,
  PredictiveMaintenanceItem,
} from "@/types/intelligence";

function probabilityFromHealth(
  healthScore: number,
): number {
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

function completionDaysFromHealth(
  healthScore: number,
): number {
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

function actionTypeFromIssue(
  issue: string | null,
): MaintenanceActionType {
  if (!issue) {
    return "monitor";
  }

  const normalized =
    issue.toLowerCase();

  if (
    normalized.includes("filter")
  ) {
    return "replace";
  }

  if (
    normalized.includes("fouling") ||
    normalized.includes("approach")
  ) {
    return "clean";
  }

  if (
    normalized.includes("sensor") ||
    normalized.includes("calibration")
  ) {
    return "calibrate";
  }

  if (
    normalized.includes("runtime") ||
    normalized.includes("degradation")
  ) {
    return "overhaul";
  }

  return "inspect";
}

function predictedIssueFromMetric(
  metric: EquipmentHealthMetric,
): string {
  if (metric.primaryIssue) {
    return metric.primaryIssue;
  }

  if (
    metric.runtimePenalty >= 10
  ) {
    return "Age-related performance degradation";
  }

  if (
    metric.efficiencyScore < 70
  ) {
    return "Efficiency deterioration";
  }

  return "No imminent failure pattern detected";
}

export function generatePredictiveMaintenance(
  equipmentHealth:
    EquipmentHealthMetric[],
): PredictiveMaintenanceItem[] {
  return equipmentHealth
    .filter(
      (metric) =>
        metric.healthScore < 82 ||
        metric.primaryIssue !== null,
    )
    .map((metric) => {
      const predictedIssue =
        predictedIssueFromMetric(
          metric,
        );

      return {
        predictionId:
          `PM-${metric.equipmentId}-${predictedIssue
            .replaceAll(" ", "-")
            .toUpperCase()}`,

        equipmentId:
          metric.equipmentId,

        equipmentName:
          metric.equipmentName,

        riskLevel:
          metric.riskLevel,

        actionType:
          actionTypeFromIssue(
            metric.primaryIssue,
          ),

        predictedIssue,

        probabilityPercent:
          probabilityFromHealth(
            metric.healthScore,
          ),

        remainingUsefulLifeDays:
          metric.remainingUsefulLifeDays,

        recommendedCompletionDays:
          completionDaysFromHealth(
            metric.healthScore,
          ),

        supportingEvidence: [
          `Health score: ${metric.healthScore}/100`,
          `Efficiency score: ${metric.efficiencyScore}/100`,
          `Runtime: ${metric.runtimeHours.toFixed(1)} hours`,
          `Performance penalty: ${metric.performancePenalty}`,
          `Alarm penalty: ${metric.alarmPenalty}`,
        ],

        recommendedAction:
          metric.recommendedAction,

        operationalImpact:
          metric.healthScore < 40
            ? "High probability of service interruption or unacceptable performance."
            : metric.healthScore < 62
              ? "Reduced efficiency, resilience and comfort performance."
              : "Maintenance can be planned before significant operational degradation.",
      };
    })
    .sort(
      (left, right) =>
        right.probabilityPercent -
        left.probabilityPercent,
    );
}
EOF

echo "Creating executive KPI engine..."

cat > src/lib/intelligence/kpi-engine.ts <<'EOF'
import {
  calculateAhuHealth,
  calculateChillerHealth,
  calculateCoolingTowerHealth,
  calculatePumpHealth,
} from "@/lib/intelligence/health-engine";

import {
  generatePredictiveMaintenance,
} from "@/lib/intelligence/predictive-maintenance";

import type {
  ExecutiveKpiSummary,
  EquipmentHealthMetric,
  ReliabilityMetrics,
} from "@/types/intelligence";

import type {
  PlantState,
} from "@/types/hvac";

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function round(
  value: number,
  decimalPlaces = 2,
): number {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(value * factor) /
    factor
  );
}

function average(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
      0,
    ) / values.length
  );
}

function calculateReliability(
  state: PlantState,
  health:
    EquipmentHealthMetric[],
): ReliabilityMetrics {
  const totalAssets =
    health.length;

  const unavailableAssets =
    [
      ...state.chillers,
      ...state.ahus,
      ...state.chilledWaterPumps,
      ...state.condenserWaterPumps,
      ...state.coolingTowers,
    ].filter(
      (equipment) =>
        equipment.status ===
          "offline" ||
        equipment.status ===
          "alarm",
    ).length;

  const availableAssets =
    Math.max(
      0,
      totalAssets -
        unavailableAssets,
    );

  const availabilityPercent =
    totalAssets > 0
      ? (
          availableAssets /
          totalAssets
        ) *
        100
      : 100;

  const totalRuntime =
    health.reduce(
      (total, item) =>
        total +
        item.runtimeHours,
      0,
    );

  const estimatedFailureEvents =
    Math.max(
      1,
      health.filter(
        (item) =>
          item.healthScore < 62,
      ).length,
    );

  const estimatedMtbfHours =
    totalRuntime /
    estimatedFailureEvents;

  const estimatedMttrHours =
    unavailableAssets > 0
      ? 8 +
        unavailableAssets * 4
      : 4;

  return {
    totalAssets,

    availableAssets,

    unavailableAssets,

    availabilityPercent:
      round(
        availabilityPercent,
      ),

    estimatedMtbfHours:
      round(
        estimatedMtbfHours,
      ),

    estimatedMttrHours:
      round(
        estimatedMttrHours,
      ),

    alarmRatePerAsset:
      totalAssets > 0
        ? round(
            state.activeAlarmCount /
              totalAssets,
            3,
          )
        : 0,

    maintenanceRiskAssets:
      health.filter(
        (item) =>
          item.riskLevel ===
            "high" ||
          item.riskLevel ===
            "critical",
      ).length,
  };
}

function calculateComfortScore(
  state: PlantState,
): number {
  if (
    state.ahus.length === 0
  ) {
    return 100;
  }

  const scores =
    state.ahus.map((ahu) => {
      const deviation =
        Math.abs(
          ahu.zoneTempC -
            ahu.setpointC,
        );

      return clamp(
        100 -
          deviation * 18,
        0,
        100,
      );
    });

  return round(
    average(scores),
  );
}

function calculateIndoorAirQualityScore(
  state: PlantState,
): number {
  if (
    state.ahus.length === 0
  ) {
    return 100;
  }

  const scores =
    state.ahus.map((ahu) => {
      if (ahu.co2Ppm <= 800) {
        return 100;
      }

      if (ahu.co2Ppm <= 1000) {
        return 85;
      }

      if (ahu.co2Ppm <= 1400) {
        return clamp(
          85 -
            (
              ahu.co2Ppm -
              1000
            ) /
              8,
          35,
          85,
        );
      }

      return 20;
    });

  return round(
    average(scores),
  );
}

function calculateEnergyEfficiencyScore(
  state: PlantState,
): number {
  const runningChillers =
    state.chillers.filter(
      (chiller) =>
        chiller.status ===
          "running" &&
        chiller.cop > 0,
    );

  if (
    runningChillers.length === 0
  ) {
    return 0;
  }

  const averageCop =
    average(
      runningChillers.map(
        (chiller) =>
          chiller.cop,
      ),
    );

  const copScore =
    clamp(
      (
        averageCop /
        5.2
      ) *
        100,
      0,
      100,
    );

  const demandPenalty =
    state.totalPowerKw > 100
      ? clamp(
          (
            state.totalPowerKw -
            100
          ) *
            0.15,
          0,
          15,
        )
      : 0;

  return round(
    clamp(
      copScore -
        demandPenalty,
      0,
      100,
    ),
  );
}

function calculateSustainabilityScore(
  energyEfficiencyScore: number,
  estimatedEnergySavingPercent: number,
): number {
  return round(
    clamp(
      energyEfficiencyScore *
        0.75 +
        estimatedEnergySavingPercent *
          2.5,
      0,
      100,
    ),
  );
}

function buildExecutiveSummary(
  performanceScore: number,
  reliability:
    ReliabilityMetrics,
  criticalAssetCount: number,
  maintenanceCount: number,
): string {
  if (
    criticalAssetCount > 0
  ) {
    return (
      `The virtual HVAC plant requires immediate attention. ` +
      `${criticalAssetCount} critical asset(s) have been identified. ` +
      `Predictive-maintenance actions should be reviewed before continuing high-demand operation.`
    );
  }

  if (
    performanceScore < 65
  ) {
    return (
      `Plant performance is degraded. ` +
      `Availability is ${reliability.availabilityPercent}% and ` +
      `${maintenanceCount} predictive-maintenance action(s) are recommended.`
    );
  }

  if (
    performanceScore < 82
  ) {
    return (
      `The plant remains operational, but selected assets require planned maintenance. ` +
      `Current availability is ${reliability.availabilityPercent}% and reliability risks should be reviewed.`
    );
  }

  return (
    `The virtual HVAC plant is operating within a healthy performance range. ` +
    `Asset availability is ${reliability.availabilityPercent}% with no immediate critical maintenance requirement.`
  );
}

export function calculateExecutiveKpis(
  state: PlantState,
): ExecutiveKpiSummary {
  const chillerHealth =
    state.chillers.map(
      calculateChillerHealth,
    );

  const ahuHealth =
    state.ahus.map(
      calculateAhuHealth,
    );

  const chilledWaterPumpHealth =
    state.chilledWaterPumps.map(
      calculatePumpHealth,
    );

  const condenserWaterPumpHealth =
    state.condenserWaterPumps.map(
      calculatePumpHealth,
    );

  const coolingTowerHealth =
    state.coolingTowers.map(
      calculateCoolingTowerHealth,
    );

  const equipmentHealth = [
    ...chillerHealth,
    ...ahuHealth,
    ...chilledWaterPumpHealth,
    ...condenserWaterPumpHealth,
    ...coolingTowerHealth,
  ].sort(
    (left, right) =>
      left.healthScore -
      right.healthScore,
  );

  const predictiveMaintenance =
    generatePredictiveMaintenance(
      equipmentHealth,
    );

  const reliability =
    calculateReliability(
      state,
      equipmentHealth,
    );

  const assetPerformanceIndex =
    round(
      average(
        equipmentHealth.map(
          (item) =>
            item.healthScore,
        ),
      ),
    );

  const energyEfficiencyScore =
    calculateEnergyEfficiencyScore(
      state,
    );

  const comfortScore =
    calculateComfortScore(
      state,
    );

  const indoorAirQualityScore =
    calculateIndoorAirQualityScore(
      state,
    );

  const reliabilityScore =
    round(
      clamp(
        reliability
          .availabilityPercent *
          0.75 +
          clamp(
            reliability
              .estimatedMtbfHours /
              250,
            0,
            25,
          ),
        0,
        100,
      ),
    );

  const estimatedEnergySavingPercent =
    round(
      clamp(
        (
          100 -
          energyEfficiencyScore
        ) *
          0.22,
        0,
        18,
      ),
    );

  const sustainabilityScore =
    calculateSustainabilityScore(
      energyEfficiencyScore,
      estimatedEnergySavingPercent,
    );

  const plantPerformanceScore =
    round(
      clamp(
        assetPerformanceIndex *
          0.28 +
          energyEfficiencyScore *
            0.22 +
          reliabilityScore *
            0.2 +
          comfortScore *
            0.15 +
          indoorAirQualityScore *
            0.1 +
          sustainabilityScore *
            0.05,
        0,
        100,
      ),
    );

  const runningChillers =
    state.chillers.filter(
      (chiller) =>
        chiller.status ===
        "running",
    );

  const averageChillerCop =
    round(
      average(
        runningChillers
          .filter(
            (chiller) =>
              chiller.cop > 0,
          )
          .map(
            (chiller) =>
              chiller.cop,
          ),
      ),
    );

  const criticalAssetCount =
    equipmentHealth.filter(
      (item) =>
        item.healthStatus ===
          "critical",
    ).length;

  const warningAssetCount =
    equipmentHealth.filter(
      (item) =>
        item.healthStatus ===
          "attention-required" ||
        item.healthStatus ===
          "degraded",
    ).length;

  const priorityActions =
    predictiveMaintenance
      .slice(0, 5)
      .map(
        (item) =>
          `${item.equipmentId}: ${item.recommendedAction}`,
      );

  if (
    priorityActions.length === 0
  ) {
    priorityActions.push(
      "Continue normal monitoring and preventive-maintenance scheduling.",
    );
  }

  return {
    generatedAt:
      new Date().toISOString(),

    plantPerformanceScore,

    assetPerformanceIndex,

    energyEfficiencyScore,

    reliabilityScore,

    comfortScore,

    indoorAirQualityScore,

    sustainabilityScore,

    averageChillerCop,

    runningChillers:
      runningChillers.length,

    activeAhus:
      state.ahus.filter(
        (ahu) =>
          ahu.status ===
          "running",
      ).length,

    totalPlantPowerKw:
      round(
        state.totalPowerKw,
      ),

    totalEnergyKwh:
      round(
        state.totalEnergyKwh,
      ),

    expectedPassengers:
      state.expectedPassengers,

    activeAlarmCount:
      state.activeAlarmCount,

    criticalAssetCount,

    warningAssetCount,

    predictedMaintenanceCount:
      predictiveMaintenance.length,

    estimatedEnergySavingPercent,

    estimatedCarbonKg:
      round(
        state.totalEnergyKwh *
          0.45,
      ),

    reliability,

    equipmentHealth,

    predictiveMaintenance,

    executiveSummary:
      buildExecutiveSummary(
        plantPerformanceScore,
        reliability,
        criticalAssetCount,
        predictiveMaintenance.length,
      ),

    priorityActions,
  };
}
EOF

echo "Creating executive intelligence API..."

cat > src/app/api/intelligence/summary/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  calculateExecutiveKpis,
} from "@/lib/intelligence/kpi-engine";

import type {
  PlantState,
} from "@/types/hvac";

const requestSchema =
  z.object({
    state:
      z.unknown(),
  });

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      requestSchema.parse(
        await request.json(),
      );

    const summary =
      calculateExecutiveKpis(
        body.state as PlantState,
      );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Executive intelligence calculation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating predictive-maintenance API..."

cat > src/app/api/intelligence/predictive-maintenance/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateExecutiveKpis,
} from "@/lib/intelligence/kpi-engine";

import type {
  PlantState,
} from "@/types/hvac";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        state: PlantState;
      };

    const summary =
      calculateExecutiveKpis(
        body.state,
      );

    return NextResponse.json({
      success: true,

      generatedAt:
        summary.generatedAt,

      count:
        summary.predictiveMaintenance.length,

      predictions:
        summary.predictiveMaintenance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Predictive-maintenance analysis failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating executive intelligence dashboard panel..."

cat > src/components/intelligence/executive-intelligence-panel.tsx <<'EOF'
"use client";

import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Leaf,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  ExecutiveKpiSummary,
} from "@/types/intelligence";

import type {
  PlantState,
} from "@/types/hvac";

function extractPlantState():
  PlantState {
  const state =
    useSimulationStore.getState();

  return {
    timestamp:
      state.timestamp,

    simulationRunning:
      state.simulationRunning,

    simulationSpeed:
      state.simulationSpeed,

    operatingMode:
      state.operatingMode,

    totalPowerKw:
      state.totalPowerKw,

    totalEnergyKwh:
      state.totalEnergyKwh,

    activeAlarmCount:
      state.activeAlarmCount,

    expectedPassengers:
      state.expectedPassengers,

    chillers:
      state.chillers,

    ahus:
      state.ahus,

    chilledWaterPumps:
      state.chilledWaterPumps,

    condenserWaterPumps:
      state.condenserWaterPumps,

    coolingTowers:
      state.coolingTowers,

    flightDemand:
      state.flightDemand,
  };
}

function scoreClass(
  score: number,
): string {
  if (score >= 85) {
    return "text-emerald-300";
  }

  if (score >= 70) {
    return "text-cyan-300";
  }

  if (score >= 55) {
    return "text-amber-300";
  }

  return "text-red-300";
}

function riskClass(
  risk:
    | "low"
    | "medium"
    | "high"
    | "critical",
): string {
  switch (risk) {
    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-300";

    case "high":
      return "border-orange-500/40 bg-orange-500/10 text-orange-300";

    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
}

export function ExecutiveIntelligencePanel() {
  const [summary, setSummary] =
    useState<ExecutiveKpiSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/intelligence/summary",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              state:
                extractPlantState(),
            }),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;
          summary?:
            ExecutiveKpiSummary;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success ||
        !result.summary
      ) {
        throw new Error(
          result.error ??
            "Executive intelligence analysis failed.",
        );
      }

      setSummary(
        result.summary,
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Executive intelligence analysis failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit
              size={21}
              className="text-violet-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Executive Digital-Twin Intelligence
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            KPI scoring, reliability analytics,
            asset health and predictive maintenance
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void runAnalysis()
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : summary ? (
            <RefreshCw size={16} />
          ) : (
            <BrainCircuit size={16} />
          )}

          {summary
            ? "Refresh intelligence"
            : "Run intelligence analysis"}
        </button>
      </header>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!summary && !error ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <BrainCircuit
              size={42}
              className="text-slate-600"
            />

            <p className="mt-4 font-medium text-slate-300">
              Executive analysis has not been run
            </p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              The intelligence engine will calculate
              plant performance, asset health,
              reliability, comfort, energy efficiency,
              remaining useful life and maintenance risk.
            </p>
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-7">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Gauge size={15} />
                  Plant performance
                </div>

                <p
                  className={[
                    "mt-2 text-3xl font-semibold",
                    scoreClass(
                      summary.plantPerformanceScore,
                    ),
                  ].join(" ")}
                >
                  {summary.plantPerformanceScore}
                  <span className="text-base text-slate-500">
                    /100
                  </span>
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Activity size={15} />
                  Asset performance index
                </div>

                <p
                  className={[
                    "mt-2 text-3xl font-semibold",
                    scoreClass(
                      summary.assetPerformanceIndex,
                    ),
                  ].join(" ")}
                >
                  {summary.assetPerformanceIndex}
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={15} />
                  Availability
                </div>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {
                    summary.reliability
                      .availabilityPercent
                  }
                  %
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Wrench size={15} />
                  Predicted maintenance
                </div>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {
                    summary.predictedMaintenanceCount
                  }
                </p>
              </article>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                {
                  label:
                    "Energy efficiency",
                  score:
                    summary.energyEfficiencyScore,
                  icon: Zap,
                },
                {
                  label:
                    "Reliability",
                  score:
                    summary.reliabilityScore,
                  icon:
                    ShieldCheck,
                },
                {
                  label:
                    "Comfort",
                  score:
                    summary.comfortScore,
                  icon:
                    CheckCircle2,
                },
                {
                  label:
                    "Air quality",
                  score:
                    summary.indoorAirQualityScore,
                  icon:
                    Activity,
                },
                {
                  label:
                    "Sustainability",
                  score:
                    summary.sustainabilityScore,
                  icon: Leaf,
                },
                {
                  label:
                    "Average COP",
                  score:
                    summary.averageChillerCop,
                  icon: Gauge,
                  isCop: true,
                },
              ].map(
                ({
                  label,
                  score,
                  icon: Icon,
                  isCop,
                }) => (
                  <article
                    key={label}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon size={14} />
                      {label}
                    </div>

                    <p
                      className={[
                        "mt-2 text-xl font-semibold",
                        isCop
                          ? "text-cyan-300"
                          : scoreClass(score),
                      ].join(" ")}
                    >
                      {score}
                      {!isCop ? "/100" : ""}
                    </p>
                  </article>
                ),
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Executive Summary
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {summary.executiveSummary}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Estimated MTBF
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {
                      summary.reliability
                        .estimatedMtbfHours
                    }{" "}
                    h
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Estimated MTTR
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {
                      summary.reliability
                        .estimatedMttrHours
                    }{" "}
                    h
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Estimated energy saving
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {
                      summary.estimatedEnergySavingPercent
                    }
                    %
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Carbon impact
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {
                      summary.estimatedCarbonKg
                    }{" "}
                    kg
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert
                  size={18}
                  className="text-amber-300"
                />

                <h3 className="font-semibold text-white">
                  Priority Actions
                </h3>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {summary.priorityActions.map(
                  (action) => (
                    <article
                      key={action}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-slate-300"
                    >
                      {action}
                    </article>
                  ),
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity
                    size={18}
                    className="text-cyan-300"
                  />

                  <h3 className="font-semibold text-white">
                    Lowest Asset Health Scores
                  </h3>
                </div>

                <span className="text-xs text-slate-500">
                  {
                    summary.equipmentHealth.length
                  }{" "}
                  assets evaluated
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">
                        Asset
                      </th>

                      <th className="px-4 py-3">
                        Health
                      </th>

                      <th className="px-4 py-3">
                        Risk
                      </th>

                      <th className="px-4 py-3">
                        Efficiency
                      </th>

                      <th className="px-4 py-3">
                        RUL
                      </th>

                      <th className="px-4 py-3">
                        Primary issue
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {summary.equipmentHealth
                      .slice(0, 8)
                      .map(
                        (asset) => (
                          <tr
                            key={
                              asset.equipmentId
                            }
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-white">
                                {
                                  asset.equipmentId
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  asset.equipmentName
                                }
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "font-semibold",
                                  scoreClass(
                                    asset.healthScore,
                                  ),
                                ].join(" ")}
                              >
                                {
                                  asset.healthScore
                                }
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "rounded-full border px-2 py-1 text-xs capitalize",
                                  riskClass(
                                    asset.riskLevel,
                                  ),
                                ].join(" ")}
                              >
                                {
                                  asset.riskLevel
                                }
                              </span>
                            </td>

                            <td className="px-4 py-3 text-slate-300">
                              {
                                asset.efficiencyScore
                              }
                              %
                            </td>

                            <td className="px-4 py-3 text-slate-300">
                              {asset.remainingUsefulLifeDays ===
                              null
                                ? "No immediate limit"
                                : `${asset.remainingUsefulLifeDays} days`}
                            </td>

                            <td className="max-w-xs px-4 py-3 text-slate-400">
                              {
                                asset.primaryIssue ??
                                "Normal condition"
                              }
                            </td>
                          </tr>
                        ),
                      )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock3
                  size={18}
                  className="text-violet-300"
                />

                <h3 className="font-semibold text-white">
                  Predictive Maintenance Forecast
                </h3>
              </div>

              {summary.predictiveMaintenance.length ===
              0 ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  No immediate predictive-maintenance
                  action is required.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {summary.predictiveMaintenance
                    .slice(0, 6)
                    .map(
                      (prediction) => (
                        <article
                          key={
                            prediction.predictionId
                          }
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">
                                {
                                  prediction.equipmentId
                                }{" "}
                                ·{" "}
                                {
                                  prediction.predictedIssue
                                }
                              </p>

                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                {
                                  prediction.recommendedAction
                                }
                              </p>
                            </div>

                            <span
                              className={[
                                "rounded-full border px-2 py-1 text-xs capitalize",
                                riskClass(
                                  prediction.riskLevel,
                                ),
                              ].join(" ")}
                            >
                              {
                                prediction.riskLevel
                              }
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-lg bg-slate-900 p-3">
                              <p className="text-slate-500">
                                Probability
                              </p>

                              <p className="mt-1 font-semibold text-white">
                                {
                                  prediction.probabilityPercent
                                }
                                %
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-900 p-3">
                              <p className="text-slate-500">
                                Complete within
                              </p>

                              <p className="mt-1 font-semibold text-white">
                                {
                                  prediction.recommendedCompletionDays
                                }{" "}
                                days
                              </p>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
EOF

echo "Adding executive intelligence panel to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/components/dashboard/plant-dashboard.tsx"
)

content = path.read_text()

import_line = (
    'import { ExecutiveIntelligencePanel } '
    'from "@/components/intelligence/executive-intelligence-panel";\n'
)

anchor = (
    'import { KpiCard } '
    'from "@/components/dashboard/kpi-card";\n'
)

if import_line not in content:
    content = content.replace(
        anchor,
        anchor + import_line,
        1,
    )

panel = '''
        <ExecutiveIntelligencePanel />

'''

markers = [
    "        <ScenarioPanel />",
    "        <FlightSchedulePanel />",
    '        <section className="grid gap-6',
]

if (
    "<ExecutiveIntelligencePanel />"
    not in content
):
    inserted = False

    for marker in markers:
        if marker in content:
            content = content.replace(
                marker,
                panel + marker,
                1,
            )

            inserted = True
            break

    if not inserted:
        raise SystemExit(
            "Unable to find dashboard insertion point."
        )

path.write_text(content)
PYTHON

echo "Creating KPI engine tests..."

cat > tests/unit/kpi-engine.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateExecutiveKpis,
} from "@/lib/intelligence/kpi-engine";

import {
  initialPlantState,
} from "@/lib/simulation/initial-state";

describe(
  "executive KPI engine",
  () => {
    it(
      "generates a complete executive summary",
      () => {
        const result =
          calculateExecutiveKpis(
            initialPlantState,
          );

        expect(
          result.plantPerformanceScore,
        ).toBeGreaterThanOrEqual(0);

        expect(
          result.plantPerformanceScore,
        ).toBeLessThanOrEqual(100);

        expect(
          result.assetPerformanceIndex,
        ).toBeGreaterThanOrEqual(0);

        expect(
          result.equipmentHealth.length,
        ).toBeGreaterThan(0);

        expect(
          result.reliability
            .totalAssets,
        ).toBe(
          result.equipmentHealth.length,
        );

        expect(
          result.executiveSummary,
        ).toBeTruthy();
      },
    );

    it(
      "detects degraded AHU filter condition",
      () => {
        const degradedState =
          structuredClone(
            initialPlantState,
          );

        degradedState.ahus[0] = {
          ...degradedState.ahus[0],

          filterDifferentialPressurePa:
            300,

          alarmLevel:
            "high",

          alarmCode:
            "FILTER_DP_CRITICAL",
        };

        const result =
          calculateExecutiveKpis(
            degradedState,
          );

        const ahu =
          result.equipmentHealth.find(
            (item) =>
              item.equipmentId ===
              degradedState.ahus[0].id,
          );

        expect(
          ahu,
        ).toBeDefined();

        expect(
          ahu?.healthScore,
        ).toBeLessThan(80);

        expect(
          result.predictiveMaintenance.some(
            (prediction) =>
              prediction.equipmentId ===
              degradedState.ahus[0].id,
          ),
        ).toBe(true);
      },
    );

    it(
      "calculates plant reliability metrics",
      () => {
        const result =
          calculateExecutiveKpis(
            initialPlantState,
          );

        expect(
          result.reliability
            .availabilityPercent,
        ).toBeGreaterThanOrEqual(0);

        expect(
          result.reliability
            .availabilityPercent,
        ).toBeLessThanOrEqual(100);

        expect(
          result.reliability
            .estimatedMtbfHours,
        ).toBeGreaterThan(0);

        expect(
          result.reliability
            .estimatedMttrHours,
        ).toBeGreaterThan(0);
      },
    );
  },
);
EOF

echo "Creating intelligence architecture documentation..."

cat > docs/intelligence/INTELLIGENCE_ARCHITECTURE.md <<'EOF'
# Digital-Twin Intelligence Architecture

## Purpose

The intelligence layer converts virtual HVAC operating data into executive
KPIs, equipment health scores, reliability indicators and predictive
maintenance recommendations.

## Current implementation

The current system uses deterministic engineering rules and weighted scoring.
It does not claim to use a trained machine-learning failure model.

## Executive KPIs

- Plant performance score
- Asset performance index
- Energy-efficiency score
- Reliability score
- Comfort score
- Indoor-air-quality score
- Sustainability score
- Average chiller COP
- Plant availability
- Estimated MTBF
- Estimated MTTR
- Predicted maintenance count

## Equipment health

Equipment health is calculated from:

- Runtime
- Active alarm severity
- Efficiency
- Flow performance
- Temperature performance
- Filter differential pressure
- CO₂ concentration
- Cooling-tower approach
- Chiller COP
- Equipment availability

## Predictive maintenance

Predictive-maintenance recommendations include:

- Risk level
- Predicted issue
- Probability estimate
- Remaining useful life estimate
- Recommended completion period
- Supporting evidence
- Recommended action
- Operational impact

## Engineering limitation

Remaining useful life and failure probability are engineering estimates for
virtual demonstration. Real predictive maintenance requires validated
historical data, verified failure labels, condition-monitoring sensors and
model validation.
EOF

echo "Formatting Part 11 files..."

npx prettier --write \
  src/types/intelligence.ts \
  src/lib/intelligence/health-engine.ts \
  src/lib/intelligence/predictive-maintenance.ts \
  src/lib/intelligence/kpi-engine.ts \
  src/app/api/intelligence/summary/route.ts \
  src/app/api/intelligence/predictive-maintenance/route.ts \
  src/components/intelligence/executive-intelligence-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  tests/unit/kpi-engine.test.ts \
  docs/intelligence/INTELLIGENCE_ARCHITECTURE.md

echo
echo "Running TypeScript validation..."

npm run typecheck

echo
echo "Running ESLint..."

npm run lint

echo
echo "Running automated tests..."

npm run test

echo
echo "Running production build..."

npm run build

echo
echo "Staging Part 11 changes..."

git add \
  scripts/11-executive-intelligence-and-predictive-maintenance.sh \
  src/types/intelligence.ts \
  src/lib/intelligence/health-engine.ts \
  src/lib/intelligence/predictive-maintenance.ts \
  src/lib/intelligence/kpi-engine.ts \
  src/app/api/intelligence/summary/route.ts \
  src/app/api/intelligence/predictive-maintenance/route.ts \
  src/components/intelligence/executive-intelligence-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  tests/unit/kpi-engine.test.ts \
  docs/intelligence/INTELLIGENCE_ARCHITECTURE.md

echo
echo "Reviewing staged changes..."

git status --short

if git diff --cached --quiet; then
  echo "No new Part 11 changes are available to commit."
else
  git commit \
    -m "feat: add executive intelligence and predictive maintenance"

  git push
fi

echo
echo "============================================================"
echo "PART 11 COMPLETED SUCCESSFULLY"
echo "EXECUTIVE INTELLIGENCE AND PREDICTIVE MAINTENANCE ARE READY"
echo "============================================================"
echo
echo "New APIs:"
echo "  POST /api/intelligence/summary"
echo "  POST /api/intelligence/predictive-maintenance"
echo
echo "New capabilities:"
echo "  Plant performance score"
echo "  Asset performance index"
echo "  Equipment health scoring"
echo "  Remaining useful life estimation"
echo "  Predictive maintenance forecast"
echo "  Reliability and availability analytics"
echo "  Estimated MTBF and MTTR"
echo "  Comfort and indoor-air-quality scoring"
echo "  Sustainability scoring"
echo "  Executive priority actions"
echo
echo "Run:"
echo "  npm run dev"
echo
echo "Open:"
echo "  http://localhost:3000/dashboard"
echo
