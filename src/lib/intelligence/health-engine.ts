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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimalPlaces = 2): number {
  const factor = 10 ** decimalPlaces;

  return Math.round(value * factor) / factor;
}

function healthStatusFromScore(score: number): AssetHealthStatus {
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

function riskFromScore(score: number): MaintenanceRisk {
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

  const scoreFactor = clamp(score / 100, 0.1, 1);

  const runtimeFactor = clamp(1 - runtimeHours / 60000, 0.15, 1);

  return Math.max(7, Math.round(730 * scoreFactor * runtimeFactor));
}

function calculateRuntimePenalty(runtimeHours: number): number {
  if (runtimeHours <= 5000) {
    return 0;
  }

  return clamp((runtimeHours - 5000) / 2500, 0, 16);
}

function calculateAlarmPenalty(
  alarmLevel: "normal" | "information" | "warning" | "high" | "critical",
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
  const runtimePenalty = calculateRuntimePenalty(chiller.runtimeHours);

  const alarmPenalty = calculateAlarmPenalty(chiller.alarmLevel);

  const copPenalty =
    chiller.status === "running" && chiller.cop > 0 && chiller.cop < 4.5
      ? clamp((4.5 - chiller.cop) * 12, 0, 22)
      : 0;

  const temperaturePenalty =
    chiller.status === "running" && chiller.chilledWaterSupplyTempC > 8
      ? clamp((chiller.chilledWaterSupplyTempC - 8) * 7, 0, 18)
      : 0;

  const loadPenalty =
    chiller.loadPercent > 92
      ? clamp((chiller.loadPercent - 92) * 1.2, 0, 10)
      : 0;

  const performancePenalty = copPenalty + temperaturePenalty + loadPenalty;

  const healthScore = round(
    clamp(100 - runtimePenalty - alarmPenalty - performancePenalty, 0, 100),
  );

  const efficiencyScore =
    chiller.cop > 0
      ? round(clamp((chiller.cop / 5.2) * 100, 0, 100))
      : chiller.status === "running"
        ? 0
        : 100;

  let primaryIssue: string | null = null;

  let recommendedAction = "Continue normal monitoring.";

  if (chiller.alarmLevel !== "normal") {
    primaryIssue = chiller.alarmCode ?? "Active chiller alarm";

    recommendedAction =
      "Review active alarm, operating interlocks and current plant conditions.";
  } else if (
    chiller.status === "running" &&
    chiller.cop > 0 &&
    chiller.cop < 4
  ) {
    primaryIssue = "Low coefficient of performance";

    recommendedAction =
      "Inspect condenser-water temperature, evaporator flow and heat-exchanger cleanliness.";
  } else if (chiller.chilledWaterSupplyTempC > 8.5) {
    primaryIssue = "High chilled-water supply temperature";

    recommendedAction =
      "Check available cooling capacity, chilled-water flow and chiller staging.";
  } else if (chiller.runtimeHours > 12000) {
    primaryIssue = "High accumulated runtime";

    recommendedAction =
      "Schedule a detailed chiller condition inspection and review preventive-maintenance history.";
  }

  return {
    equipmentId: chiller.id,

    equipmentName: chiller.name,

    equipmentType: chiller.equipmentType,

    healthScore,

    healthStatus: healthStatusFromScore(healthScore),

    riskLevel: riskFromScore(healthScore),

    remainingUsefulLifeDays: estimateRemainingUsefulLifeDays(
      healthScore,
      chiller.runtimeHours,
    ),

    runtimeHours: chiller.runtimeHours,

    availabilityPercent:
      chiller.status === "offline" || chiller.status === "alarm" ? 0 : 100,

    efficiencyScore,

    alarmPenalty: round(alarmPenalty),

    runtimePenalty: round(runtimePenalty),

    performancePenalty: round(performancePenalty),

    primaryIssue,

    recommendedAction,
  };
}

export function calculateAhuHealth(ahu: AhuState): EquipmentHealthMetric {
  const runtimePenalty = calculateRuntimePenalty(ahu.runtimeHours);

  const alarmPenalty = calculateAlarmPenalty(ahu.alarmLevel);

  const airflowRatio =
    ahu.designAirflowCmh > 0 ? ahu.airflowCmh / ahu.designAirflowCmh : 0;

  const airflowPenalty =
    ahu.status === "running" && airflowRatio < 0.78
      ? clamp((0.78 - airflowRatio) * 70, 0, 20)
      : 0;

  const filterPenalty =
    ahu.filterDifferentialPressurePa > 180
      ? clamp((ahu.filterDifferentialPressurePa - 180) / 6, 0, 22)
      : 0;

  const comfortPenalty =
    Math.abs(ahu.zoneTempC - ahu.setpointC) > 2
      ? clamp((Math.abs(ahu.zoneTempC - ahu.setpointC) - 2) * 5, 0, 16)
      : 0;

  const airQualityPenalty =
    ahu.co2Ppm > 1000 ? clamp((ahu.co2Ppm - 1000) / 35, 0, 20) : 0;

  const performancePenalty =
    airflowPenalty + filterPenalty + comfortPenalty + airQualityPenalty;

  const healthScore = round(
    clamp(100 - runtimePenalty - alarmPenalty - performancePenalty, 0, 100),
  );

  const efficiencyScore = round(
    clamp(100 - filterPenalty - airflowPenalty, 0, 100),
  );

  let primaryIssue: string | null = null;

  let recommendedAction = "Continue normal monitoring.";

  if (ahu.filterDifferentialPressurePa >= 250) {
    primaryIssue = "Critical filter restriction";

    recommendedAction =
      "Inspect and replace the air filter, then verify airflow and differential pressure.";
  } else if (ahu.filterDifferentialPressurePa >= 180) {
    primaryIssue = "High filter differential pressure";

    recommendedAction =
      "Schedule filter inspection and confirm post-maintenance airflow.";
  } else if (ahu.co2Ppm >= 1000) {
    primaryIssue = "Insufficient ventilation";

    recommendedAction =
      "Review occupancy and increase outdoor-air supply within operating limits.";
  } else if (airflowRatio < 0.78 && ahu.status === "running") {
    primaryIssue = "Low airflow performance";

    recommendedAction =
      "Inspect fan speed, damper position, filter condition and duct restrictions.";
  }

  return {
    equipmentId: ahu.id,

    equipmentName: ahu.name,

    equipmentType: ahu.equipmentType,

    healthScore,

    healthStatus: healthStatusFromScore(healthScore),

    riskLevel: riskFromScore(healthScore),

    remainingUsefulLifeDays: estimateRemainingUsefulLifeDays(
      healthScore,
      ahu.runtimeHours,
    ),

    runtimeHours: ahu.runtimeHours,

    availabilityPercent:
      ahu.status === "offline" || ahu.status === "alarm" ? 0 : 100,

    efficiencyScore,

    alarmPenalty: round(alarmPenalty),

    runtimePenalty: round(runtimePenalty),

    performancePenalty: round(performancePenalty),

    primaryIssue,

    recommendedAction,
  };
}

export function calculatePumpHealth(pump: PumpState): EquipmentHealthMetric {
  const runtimePenalty = calculateRuntimePenalty(pump.runtimeHours);

  const alarmPenalty = calculateAlarmPenalty(pump.alarmLevel);

  const flowRatio =
    pump.designFlowM3h > 0 ? pump.flowM3h / pump.designFlowM3h : 0;

  const flowPenalty =
    pump.status === "running" && flowRatio < 0.7
      ? clamp((0.7 - flowRatio) * 60, 0, 22)
      : 0;

  const pressurePenalty =
    pump.differentialPressureBar > 4
      ? clamp((pump.differentialPressureBar - 4) * 5, 0, 16)
      : 0;

  const performancePenalty = flowPenalty + pressurePenalty;

  const healthScore = round(
    clamp(100 - runtimePenalty - alarmPenalty - performancePenalty, 0, 100),
  );

  return {
    equipmentId: pump.id,

    equipmentName: pump.name,

    equipmentType: pump.equipmentType,

    healthScore,

    healthStatus: healthStatusFromScore(healthScore),

    riskLevel: riskFromScore(healthScore),

    remainingUsefulLifeDays: estimateRemainingUsefulLifeDays(
      healthScore,
      pump.runtimeHours,
    ),

    runtimeHours: pump.runtimeHours,

    availabilityPercent:
      pump.status === "offline" || pump.status === "alarm" ? 0 : 100,

    efficiencyScore: round(clamp(flowRatio * 100, 0, 100)),

    alarmPenalty: round(alarmPenalty),

    runtimePenalty: round(runtimePenalty),

    performancePenalty: round(performancePenalty),

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
  const runtimePenalty = calculateRuntimePenalty(tower.runtimeHours);

  const alarmPenalty = calculateAlarmPenalty(tower.alarmLevel);

  const approachPenalty =
    tower.status === "running" && tower.approachC > 6
      ? clamp((tower.approachC - 6) * 6, 0, 22)
      : 0;

  const leavingTemperaturePenalty =
    tower.status === "running" && tower.leavingWaterTempC > 33
      ? clamp((tower.leavingWaterTempC - 33) * 4, 0, 16)
      : 0;

  const performancePenalty = approachPenalty + leavingTemperaturePenalty;

  const healthScore = round(
    clamp(100 - runtimePenalty - alarmPenalty - performancePenalty, 0, 100),
  );

  return {
    equipmentId: tower.id,

    equipmentName: tower.name,

    equipmentType: tower.equipmentType,

    healthScore,

    healthStatus: healthStatusFromScore(healthScore),

    riskLevel: riskFromScore(healthScore),

    remainingUsefulLifeDays: estimateRemainingUsefulLifeDays(
      healthScore,
      tower.runtimeHours,
    ),

    runtimeHours: tower.runtimeHours,

    availabilityPercent:
      tower.status === "offline" || tower.status === "alarm" ? 0 : 100,

    efficiencyScore: round(
      clamp(100 - approachPenalty - leavingTemperaturePenalty, 0, 100),
    ),

    alarmPenalty: round(alarmPenalty),

    runtimePenalty: round(runtimePenalty),

    performancePenalty: round(performancePenalty),

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
