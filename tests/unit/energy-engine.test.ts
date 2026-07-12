import { describe, expect, it } from "vitest";

import {
  calculateEnergySample,
  calculateEnergySummary,
} from "@/lib/energy/energy-engine";

import { initialPlantState } from "@/lib/simulation/initial-state";

import type { PlantState } from "@/types/hvac";

function createRunningPlantFixture(): PlantState {
  return {
    ...initialPlantState,
    simulationRunning: true,
    totalPowerKw: 20,
    expectedPassengers: 500,

    chillers: initialPlantState.chillers.map((chiller, index) => {
      if (index !== 0) {
        return chiller;
      }

      return {
        ...chiller,
        status: "running",
        mode: "automatic",
        loadPercent: 70,
        powerKw: 8,
        chilledWaterFlowM3h: 18,
        condenserWaterFlowM3h: 22,
        compressorRunning: true,
      };
    }),

    ahus: initialPlantState.ahus.map((ahu, index) => {
      if (index !== 0) {
        return ahu;
      }

      return {
        ...ahu,
        status: "running",
        mode: "automatic",
        fanSpeedPercent: 60,
        airflowCmh: Math.round(ahu.designAirflowCmh * 0.6),
        powerKw: 3,
      };
    }),

    chilledWaterPumps: initialPlantState.chilledWaterPumps.map(
      (pump, index) => {
        if (index !== 0) {
          return pump;
        }

        return {
          ...pump,
          status: "running",
          mode: "automatic",
          speedPercent: 70,
          flowM3h: 18,
          headM: 22,
          differentialPressureBar: 1.8,
          powerKw: 3,
          currentA: 6.5,
        };
      },
    ),

    condenserWaterPumps: initialPlantState.condenserWaterPumps.map(
      (pump, index) => {
        if (index !== 0) {
          return pump;
        }

        return {
          ...pump,
          status: "running",
          mode: "automatic",
          speedPercent: 72,
          flowM3h: 22,
          headM: 19,
          differentialPressureBar: 1.7,
          powerKw: 3.5,
          currentA: 6.8,
        };
      },
    ),

    coolingTowers: initialPlantState.coolingTowers.map((tower, index) => {
      if (index !== 0) {
        return tower;
      }

      return {
        ...tower,
        status: "running",
        mode: "automatic",
        fanSpeedPercent: 65,
        enteringWaterTempC: 34,
        leavingWaterTempC: 29,
        rangeC: 5,
        waterFlowM3h: 22,
        powerKw: 2.5,
      };
    }),
  };
}

describe("energy engine", () => {
  it("calculates zero energy for the safe stopped startup state", () => {
    const sample = calculateEnergySample(initialPlantState, 60, 0);

    expect(sample.totalPowerKw).toBe(0);
    expect(sample.intervalEnergyKwh).toBe(0);
    expect(sample.cumulativeEnergyKwh).toBe(0);
  });

  it("calculates a positive energy sample for an operating plant", () => {
    const runningPlant = createRunningPlantFixture();

    const sample = calculateEnergySample(runningPlant, 60, 0);

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
