import { describe, expect, it } from "vitest";

import {
  calculateEnergySample,
  calculateEnergySummary,
} from "@/lib/energy/energy-engine";

import { initialPlantState } from "@/lib/simulation/initial-state";

describe("energy engine", () => {
  it("calculates a positive energy sample", () => {
    const sample = calculateEnergySample(initialPlantState, 60, 0);

    expect(sample.totalPowerKw).toBeGreaterThan(0);

    expect(sample.intervalEnergyKwh).toBeGreaterThan(0);

    expect(sample.cumulativeEnergyKwh).toBe(sample.intervalEnergyKwh);
  });

  it("calculates an empty energy summary", () => {
    expect(calculateEnergySummary([])).toEqual({
      currentPowerKw: 0,
      totalEnergyKwh: 0,
      peakPowerKw: 0,
      averagePowerKw: 0,
      estimatedBaselineKwh: 0,
      estimatedSavingKwh: 0,
      estimatedSavingPercent: 0,
      estimatedCarbonKg: 0,
    });
  });

  it("calculates peak and average power", () => {
    const summary = calculateEnergySummary([
      {
        timestamp: "2026-07-11T09:00:00.000Z",
        totalPowerKw: 20,
        chillerPowerKw: 10,
        ahuPowerKw: 5,
        pumpPowerKw: 3,
        coolingTowerPowerKw: 2,
        intervalEnergyKwh: 1,
        cumulativeEnergyKwh: 1,
        expectedPassengers: 500,
      },
      {
        timestamp: "2026-07-11T09:05:00.000Z",
        totalPowerKw: 30,
        chillerPowerKw: 15,
        ahuPowerKw: 8,
        pumpPowerKw: 4,
        coolingTowerPowerKw: 3,
        intervalEnergyKwh: 1.5,
        cumulativeEnergyKwh: 2.5,
        expectedPassengers: 800,
      },
    ]);

    expect(summary.currentPowerKw).toBe(30);

    expect(summary.peakPowerKw).toBe(30);

    expect(summary.averagePowerKw).toBe(25);

    expect(summary.totalEnergyKwh).toBe(2.5);
  });
});
