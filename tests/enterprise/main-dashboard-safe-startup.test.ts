import { describe, expect, it } from "vitest";

import { initialPlantState } from "@/lib/simulation/initial-state";

describe("main dashboard safe startup", () => {
  it("starts legacy simulation paused", () => {
    expect(initialPlantState.simulationRunning).toBe(false);
  });

  it("starts all chillers not running", () => {
    expect(
      initialPlantState.chillers.every(
        (chiller) =>
          chiller.status !== "running" &&
          chiller.powerKw === 0 &&
          !chiller.compressorRunning,
      ),
    ).toBe(true);
  });

  it("starts all AHUs stopped", () => {
    expect(
      initialPlantState.ahus.every(
        (ahu) =>
          ahu.status === "stopped" &&
          ahu.fanSpeedPercent === 0 &&
          ahu.airflowCmh === 0 &&
          ahu.powerKw === 0,
      ),
    ).toBe(true);
  });

  it("starts pumps and towers stopped", () => {
    expect(
      [
        ...initialPlantState.chilledWaterPumps,
        ...initialPlantState.condenserWaterPumps,
        ...initialPlantState.coolingTowers,
      ].every(
        (equipment) =>
          equipment.status !== "running" && equipment.powerKw === 0,
      ),
    ).toBe(true);
  });

  it("starts without demo passenger demand", () => {
    expect(initialPlantState.expectedPassengers).toBe(0);

    expect(initialPlantState.totalPowerKw).toBe(0);
  });
});
