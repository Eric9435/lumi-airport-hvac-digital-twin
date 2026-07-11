import {
  calculateAhuHealth,
  calculateChillerHealth,
  calculateCoolingTowerHealth,
  calculatePumpHealth,
} from "@/lib/intelligence/health-engine";

import { generatePredictiveMaintenance } from "@/lib/intelligence/predictive-maintenance";

import type {
  ExecutiveKpiSummary,
  EquipmentHealthMetric,
  ReliabilityMetrics,
} from "@/types/intelligence";

import type { PlantState } from "@/types/hvac";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, decimalPlaces = 2): number {
  const factor = 10 ** decimalPlaces;

  return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function calculateReliability(
  state: PlantState,
  health: EquipmentHealthMetric[],
): ReliabilityMetrics {
  const totalAssets = health.length;

  const unavailableAssets = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ].filter(
    (equipment) =>
      equipment.status === "offline" || equipment.status === "alarm",
  ).length;

  const availableAssets = Math.max(0, totalAssets - unavailableAssets);

  const availabilityPercent =
    totalAssets > 0 ? (availableAssets / totalAssets) * 100 : 100;

  const totalRuntime = health.reduce(
    (total, item) => total + item.runtimeHours,
    0,
  );

  const estimatedFailureEvents = Math.max(
    1,
    health.filter((item) => item.healthScore < 62).length,
  );

  const estimatedMtbfHours = totalRuntime / estimatedFailureEvents;

  const estimatedMttrHours =
    unavailableAssets > 0 ? 8 + unavailableAssets * 4 : 4;

  return {
    totalAssets,

    availableAssets,

    unavailableAssets,

    availabilityPercent: round(availabilityPercent),

    estimatedMtbfHours: round(estimatedMtbfHours),

    estimatedMttrHours: round(estimatedMttrHours),

    alarmRatePerAsset:
      totalAssets > 0 ? round(state.activeAlarmCount / totalAssets, 3) : 0,

    maintenanceRiskAssets: health.filter(
      (item) => item.riskLevel === "high" || item.riskLevel === "critical",
    ).length,
  };
}

function calculateComfortScore(state: PlantState): number {
  if (state.ahus.length === 0) {
    return 100;
  }

  const scores = state.ahus.map((ahu) => {
    const deviation = Math.abs(ahu.zoneTempC - ahu.setpointC);

    return clamp(100 - deviation * 18, 0, 100);
  });

  return round(average(scores));
}

function calculateIndoorAirQualityScore(state: PlantState): number {
  if (state.ahus.length === 0) {
    return 100;
  }

  const scores = state.ahus.map((ahu) => {
    if (ahu.co2Ppm <= 800) {
      return 100;
    }

    if (ahu.co2Ppm <= 1000) {
      return 85;
    }

    if (ahu.co2Ppm <= 1400) {
      return clamp(85 - (ahu.co2Ppm - 1000) / 8, 35, 85);
    }

    return 20;
  });

  return round(average(scores));
}

function calculateEnergyEfficiencyScore(state: PlantState): number {
  const runningChillers = state.chillers.filter(
    (chiller) => chiller.status === "running" && chiller.cop > 0,
  );

  if (runningChillers.length === 0) {
    return 0;
  }

  const averageCop = average(runningChillers.map((chiller) => chiller.cop));

  const copScore = clamp((averageCop / 5.2) * 100, 0, 100);

  const demandPenalty =
    state.totalPowerKw > 100
      ? clamp((state.totalPowerKw - 100) * 0.15, 0, 15)
      : 0;

  return round(clamp(copScore - demandPenalty, 0, 100));
}

function calculateSustainabilityScore(
  energyEfficiencyScore: number,
  estimatedEnergySavingPercent: number,
): number {
  return round(
    clamp(
      energyEfficiencyScore * 0.75 + estimatedEnergySavingPercent * 2.5,
      0,
      100,
    ),
  );
}

function buildExecutiveSummary(
  performanceScore: number,
  reliability: ReliabilityMetrics,
  criticalAssetCount: number,
  maintenanceCount: number,
): string {
  if (criticalAssetCount > 0) {
    return (
      `The virtual HVAC plant requires immediate attention. ` +
      `${criticalAssetCount} critical asset(s) have been identified. ` +
      `Predictive-maintenance actions should be reviewed before continuing high-demand operation.`
    );
  }

  if (performanceScore < 65) {
    return (
      `Plant performance is degraded. ` +
      `Availability is ${reliability.availabilityPercent}% and ` +
      `${maintenanceCount} predictive-maintenance action(s) are recommended.`
    );
  }

  if (performanceScore < 82) {
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

export function calculateExecutiveKpis(state: PlantState): ExecutiveKpiSummary {
  const chillerHealth = state.chillers.map(calculateChillerHealth);

  const ahuHealth = state.ahus.map(calculateAhuHealth);

  const chilledWaterPumpHealth =
    state.chilledWaterPumps.map(calculatePumpHealth);

  const condenserWaterPumpHealth =
    state.condenserWaterPumps.map(calculatePumpHealth);

  const coolingTowerHealth = state.coolingTowers.map(
    calculateCoolingTowerHealth,
  );

  const equipmentHealth = [
    ...chillerHealth,
    ...ahuHealth,
    ...chilledWaterPumpHealth,
    ...condenserWaterPumpHealth,
    ...coolingTowerHealth,
  ].sort((left, right) => left.healthScore - right.healthScore);

  const predictiveMaintenance = generatePredictiveMaintenance(equipmentHealth);

  const reliability = calculateReliability(state, equipmentHealth);

  const assetPerformanceIndex = round(
    average(equipmentHealth.map((item) => item.healthScore)),
  );

  const energyEfficiencyScore = calculateEnergyEfficiencyScore(state);

  const comfortScore = calculateComfortScore(state);

  const indoorAirQualityScore = calculateIndoorAirQualityScore(state);

  const reliabilityScore = round(
    clamp(
      reliability.availabilityPercent * 0.75 +
        clamp(reliability.estimatedMtbfHours / 250, 0, 25),
      0,
      100,
    ),
  );

  const estimatedEnergySavingPercent = round(
    clamp((100 - energyEfficiencyScore) * 0.22, 0, 18),
  );

  const sustainabilityScore = calculateSustainabilityScore(
    energyEfficiencyScore,
    estimatedEnergySavingPercent,
  );

  const plantPerformanceScore = round(
    clamp(
      assetPerformanceIndex * 0.28 +
        energyEfficiencyScore * 0.22 +
        reliabilityScore * 0.2 +
        comfortScore * 0.15 +
        indoorAirQualityScore * 0.1 +
        sustainabilityScore * 0.05,
      0,
      100,
    ),
  );

  const runningChillers = state.chillers.filter(
    (chiller) => chiller.status === "running",
  );

  const averageChillerCop = round(
    average(
      runningChillers
        .filter((chiller) => chiller.cop > 0)
        .map((chiller) => chiller.cop),
    ),
  );

  const criticalAssetCount = equipmentHealth.filter(
    (item) => item.healthStatus === "critical",
  ).length;

  const warningAssetCount = equipmentHealth.filter(
    (item) =>
      item.healthStatus === "attention-required" ||
      item.healthStatus === "degraded",
  ).length;

  const priorityActions = predictiveMaintenance
    .slice(0, 5)
    .map((item) => `${item.equipmentId}: ${item.recommendedAction}`);

  if (priorityActions.length === 0) {
    priorityActions.push(
      "Continue normal monitoring and preventive-maintenance scheduling.",
    );
  }

  return {
    generatedAt: new Date().toISOString(),

    plantPerformanceScore,

    assetPerformanceIndex,

    energyEfficiencyScore,

    reliabilityScore,

    comfortScore,

    indoorAirQualityScore,

    sustainabilityScore,

    averageChillerCop,

    runningChillers: runningChillers.length,

    activeAhus: state.ahus.filter((ahu) => ahu.status === "running").length,

    totalPlantPowerKw: round(state.totalPowerKw),

    totalEnergyKwh: round(state.totalEnergyKwh),

    expectedPassengers: state.expectedPassengers,

    activeAlarmCount: state.activeAlarmCount,

    criticalAssetCount,

    warningAssetCount,

    predictedMaintenanceCount: predictiveMaintenance.length,

    estimatedEnergySavingPercent,

    estimatedCarbonKg: round(state.totalEnergyKwh * 0.45),

    reliability,

    equipmentHealth,

    predictiveMaintenance,

    executiveSummary: buildExecutiveSummary(
      plantPerformanceScore,
      reliability,
      criticalAssetCount,
      predictiveMaintenance.length,
    ),

    priorityActions,
  };
}
