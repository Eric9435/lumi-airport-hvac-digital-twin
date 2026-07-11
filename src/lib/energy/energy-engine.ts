import type { EnergySample, EnergySummary } from "@/types/analytics";

import type { PlantState } from "@/types/hvac";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function calculateEnergySample(
  state: PlantState,
  intervalSeconds: number,
  previousCumulativeEnergyKwh: number,
): EnergySample {
  const chillerPowerKw = state.chillers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const ahuPowerKw = state.ahus.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const chilledWaterPumpPower = state.chilledWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const condenserWaterPumpPower = state.condenserWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const pumpPowerKw = chilledWaterPumpPower + condenserWaterPumpPower;

  const coolingTowerPowerKw = state.coolingTowers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const totalPowerKw =
    chillerPowerKw + ahuPowerKw + pumpPowerKw + coolingTowerPowerKw;

  const intervalEnergyKwh = totalPowerKw * (intervalSeconds / 3600);

  return {
    timestamp: new Date().toISOString(),

    totalPowerKw: round(totalPowerKw),

    chillerPowerKw: round(chillerPowerKw),

    ahuPowerKw: round(ahuPowerKw),

    pumpPowerKw: round(pumpPowerKw),

    coolingTowerPowerKw: round(coolingTowerPowerKw),

    intervalEnergyKwh: round(intervalEnergyKwh, 4),

    cumulativeEnergyKwh: round(
      previousCumulativeEnergyKwh + intervalEnergyKwh,
      4,
    ),

    expectedPassengers: state.expectedPassengers,
  };
}

export function calculateEnergySummary(samples: EnergySample[]): EnergySummary {
  if (samples.length === 0) {
    return {
      currentPowerKw: 0,
      totalEnergyKwh: 0,
      peakPowerKw: 0,
      averagePowerKw: 0,
      estimatedBaselineKwh: 0,
      estimatedSavingKwh: 0,
      estimatedSavingPercent: 0,
      estimatedCarbonKg: 0,
    };
  }

  const current = samples[samples.length - 1];

  const peakPowerKw = Math.max(...samples.map((sample) => sample.totalPowerKw));

  const averagePowerKw =
    samples.reduce((total, sample) => total + sample.totalPowerKw, 0) /
    samples.length;

  const totalEnergyKwh = current.cumulativeEnergyKwh;

  const estimatedBaselineKwh = totalEnergyKwh * 1.12;

  const estimatedSavingKwh = estimatedBaselineKwh - totalEnergyKwh;

  const estimatedSavingPercent =
    estimatedBaselineKwh > 0
      ? (estimatedSavingKwh / estimatedBaselineKwh) * 100
      : 0;

  const carbonFactorKgPerKwh = 0.45;

  return {
    currentPowerKw: round(current.totalPowerKw),

    totalEnergyKwh: round(totalEnergyKwh),

    peakPowerKw: round(peakPowerKw),

    averagePowerKw: round(averagePowerKw),

    estimatedBaselineKwh: round(estimatedBaselineKwh),

    estimatedSavingKwh: round(estimatedSavingKwh),

    estimatedSavingPercent: round(estimatedSavingPercent),

    estimatedCarbonKg: round(totalEnergyKwh * carbonFactorKgPerKwh),
  };
}
