import { randomUUID } from "node:crypto";

import type { ActiveAlarm, EnergySample } from "@/types/analytics";

import type { DailyOperationalReport } from "@/types/operations";

import type { PlantState } from "@/types/hvac";

function round(value: number, decimalPlaces = 2): number {
  const factor = 10 ** decimalPlaces;

  return Math.round(value * factor) / factor;
}

export function generateDailyReport(
  state: PlantState,
  energySamples: EnergySample[],
  alarms: ActiveAlarm[],
  totalFlights: number,
): DailyOperationalReport {
  const runningChillers = state.chillers.filter(
    (chiller) => chiller.status === "running",
  );

  const activeAhus = state.ahus.filter((ahu) => ahu.status === "running");

  const runningChillerCop = runningChillers
    .filter((chiller) => chiller.cop > 0)
    .map((chiller) => chiller.cop);

  const averageChillerCop =
    runningChillerCop.length > 0
      ? runningChillerCop.reduce((total, cop) => total + cop, 0) /
        runningChillerCop.length
      : 0;

  const currentEnergy =
    energySamples.length > 0
      ? energySamples[energySamples.length - 1].cumulativeEnergyKwh
      : state.totalEnergyKwh;

  const baselineEnergy = currentEnergy * 1.12;

  const estimatedEnergySavingKwh = Math.max(0, baselineEnergy - currentEnergy);

  const warningCount = alarms.filter(
    (alarm) => alarm.alarmLevel === "warning",
  ).length;

  const criticalCount = alarms.filter(
    (alarm) => alarm.alarmLevel === "critical",
  ).length;

  const unavailableEquipment = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ].filter(
    (equipment) =>
      equipment.status === "offline" || equipment.status === "alarm",
  ).length;

  const totalEquipment =
    state.chillers.length +
    state.ahus.length +
    state.chilledWaterPumps.length +
    state.condenserWaterPumps.length +
    state.coolingTowers.length;

  const availability =
    totalEquipment > 0
      ? ((totalEquipment - unavailableEquipment) / totalEquipment) * 100
      : 100;

  const executiveSummary =
    criticalCount > 0
      ? `Critical operational conditions were detected. ${criticalCount} critical alarm(s) require immediate review.`
      : warningCount > 0
        ? `The plant remained operational with ${warningCount} warning condition(s) requiring attention.`
        : "The virtual HVAC plant operated normally with no active warning or critical alarms.";

  return {
    reportId: randomUUID(),
    reportDate: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    operatingMode: state.operatingMode,
    totalFlights,
    expectedPassengers: state.expectedPassengers,
    runningChillers: runningChillers.length,
    activeAhus: activeAhus.length,
    totalPlantPowerKw: round(state.totalPowerKw),
    totalEnergyKwh: round(currentEnergy),
    activeAlarmCount: alarms.length,
    warningCount,
    criticalCount,
    averageChillerCop: round(averageChillerCop),
    plantAvailabilityPercent: round(availability),
    estimatedEnergySavingKwh: round(estimatedEnergySavingKwh),
    estimatedCarbonKg: round(currentEnergy * 0.45),
    executiveSummary,
  };
}
