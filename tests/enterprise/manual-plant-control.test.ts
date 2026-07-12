import { describe, expect, it } from "vitest";

import { initialEnterprisePlantState } from "@/lib/enterprise/initial-enterprise-state";
import {
  manualStartAll,
  manualStartChillerGroup,
  manualStartEquipment,
  manualStopAll,
  manualStopChillerGroup,
} from "@/lib/enterprise/manual-plant-control";
import { runManualMeterTick } from "@/lib/enterprise/manual-meter-tick";

describe("manual chiller-group mapping", () => {
  it("starts the associated transformer, pumps, starter and cooling-tower fans", () => {
    const next = manualStartChillerGroup(initialEnterprisePlantState, "CH-01");

    expect(next.transformers.find((item) => item.id === "TR-01")?.status).toBe(
      "energized",
    );

    expect(
      next.primaryPumps.find((item) => item.id === "PCHWP-01")?.status,
    ).toBe("running");

    expect(
      next.condenserPumps.find((item) => item.id === "CWP-01")?.status,
    ).toBe("running");

    expect(next.starters.find((item) => item.id === "SD-CH-01")?.status).toBe(
      "delta-running",
    );

    const runningFans = next.coolingTowers.reduce(
      (total, tower) =>
        total + tower.fans.filter((fan) => fan.status === "running").length,
      0,
    );

    expect(runningFans).toBeGreaterThanOrEqual(2);
  });

  it("stops the complete mapped group without resetting meters", () => {
    let state = manualStartChillerGroup(initialEnterprisePlantState, "CH-01");

    state = runManualMeterTick(state, 3600);

    const energyBeforeStop = state.totalPlantEnergyKwh;

    state = manualStopChillerGroup(state, "CH-01");

    expect(state.transformers.find((item) => item.id === "TR-01")?.status).toBe(
      "off",
    );

    expect(
      state.primaryPumps.find((item) => item.id === "PCHWP-01")?.status,
    ).not.toBe("running");

    expect(state.starters.find((item) => item.id === "SD-CH-01")?.status).toBe(
      "stopped",
    );

    expect(state.totalPlantEnergyKwh).toBe(energyBeforeStop);
  });

  it("changes the second secondary pump role to assist when it is running", () => {
    let state = manualStartEquipment(initialEnterprisePlantState, "SCHWP-01");

    state = manualStartEquipment(state, "SCHWP-02");

    expect(
      state.secondaryPumps.find((item) => item.id === "SCHWP-01")?.dutyRole,
    ).toBe("duty");

    expect(
      state.secondaryPumps.find((item) => item.id === "SCHWP-02")?.dutyRole,
    ).toBe("assist");
  });

  it("supports Start All and Stop All", () => {
    const started = manualStartAll(initialEnterprisePlantState);

    expect(
      started.groups.filter((group) => group.status === "running"),
    ).toHaveLength(4);

    const stopped = manualStopAll(started);

    expect(stopped.groups.some((group) => group.status === "running")).toBe(
      false,
    );

    expect(
      stopped.coolingTowers.some((tower) =>
        tower.fans.some((fan) => fan.status === "running"),
      ),
    ).toBe(false);
  });

  it("continues runtime and energy metering in manual mode", () => {
    let state = manualStartChillerGroup(initialEnterprisePlantState, "CH-01");

    state = runManualMeterTick(state, 3600);

    expect(state.totalPlantEnergyKwh).toBeGreaterThan(0);
    expect(state.plantRuntimeSeconds).toBe(3600);
    expect(state.totalElectricityCostMmk).toBeCloseTo(
      state.totalPlantEnergyKwh * 900,
      5,
    );
  });
});
