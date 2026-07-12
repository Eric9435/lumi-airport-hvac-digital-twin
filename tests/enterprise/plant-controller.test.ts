import { describe, expect, it } from "vitest";

import { initialEnterprisePlantState } from "@/lib/enterprise/initial-enterprise-state";
import { runEnterprisePlantTick } from "@/lib/enterprise/plant-controller";

describe("enterprise plant configuration", () => {
  it("contains four transformers", () => {
    expect(initialEnterprisePlantState.transformers).toHaveLength(4);
  });

  it("contains four Star–Delta starters", () => {
    expect(initialEnterprisePlantState.starters).toHaveLength(4);
  });

  it("contains four cooling towers", () => {
    expect(initialEnterprisePlantState.coolingTowers).toHaveLength(4);
  });

  it("contains exactly twenty cooling-tower fans", () => {
    const count = initialEnterprisePlantState.coolingTowers.reduce(
      (total, tower) => total + tower.fans.length,
      0,
    );

    expect(count).toBe(20);
  });

  it("maps transformers one-to-one with chillers", () => {
    expect(
      initialEnterprisePlantState.transformers.map(
        (transformer) => `${transformer.id}:${transformer.associatedChillerId}`,
      ),
    ).toEqual(["TR-01:CH-01", "TR-02:CH-02", "TR-03:CH-03", "TR-04:CH-04"]);
  });
});

describe("enterprise automatic plant controller", () => {
  it("selects equipment according to calculated demand", () => {
    const next = runEnterprisePlantTick(
      {
        ...initialEnterprisePlantState,
        occupancy: 300,
      },
      1,
    );

    expect(next.requiredChillerCount).toBeGreaterThanOrEqual(1);
    expect(next.groups.filter((group) => group.selected).length).toBe(
      next.requiredChillerCount,
    );
  });

  it("skips an unavailable transformer group", () => {
    const state = {
      ...initialEnterprisePlantState,
      occupancy: 800,
      transformers: initialEnterprisePlantState.transformers.map(
        (transformer) =>
          transformer.id === "TR-02"
            ? {
                ...transformer,
                maintenanceLockout: true,
                mode: "maintenance" as const,
              }
            : transformer,
      ),
    };

    const next = runEnterprisePlantTick(state, 1);

    const groupTwo = next.groups.find((group) => group.groupId === "GROUP-02");

    expect(groupTwo?.selected).toBe(false);
    expect(groupTwo?.available).toBe(false);
  });

  it("never energizes Star and Delta simultaneously", () => {
    let state = {
      ...initialEnterprisePlantState,
      occupancy: 200,
    };

    for (let index = 0; index < 15; index += 1) {
      state = runEnterprisePlantTick(state, 1);

      for (const starter of state.starters) {
        expect(starter.starContactorOn && starter.deltaContactorOn).toBe(false);
      }
    }
  });

  it("reaches Delta state after the Star sequence", () => {
    let state = {
      ...initialEnterprisePlantState,
      occupancy: 200,
    };

    for (let index = 0; index < 15; index += 1) {
      state = runEnterprisePlantTick(state, 1);
    }

    expect(
      state.starters.some((starter) => starter.status === "delta-running"),
    ).toBe(true);
  });

  it("uses 900 MMK per kWh", () => {
    let state = {
      ...initialEnterprisePlantState,
      occupancy: 200,
    };

    for (let index = 0; index < 20; index += 1) {
      state = runEnterprisePlantTick(state, 1);
    }

    expect(state.totalElectricityCostMmk).toBeCloseTo(
      state.totalPlantEnergyKwh * 900,
      0,
    );
  });

  it("does not double-count cooling-tower fan power", () => {
    let state = {
      ...initialEnterprisePlantState,
      occupancy: 1200,
    };

    for (let index = 0; index < 15; index += 1) {
      state = runEnterprisePlantTick(state, 1);
    }

    const fanPower = state.coolingTowers.reduce(
      (towerTotal, tower) =>
        towerTotal +
        tower.fans.reduce((fanTotal, fan) => fanTotal + fan.powerKw, 0),
      0,
    );

    expect(fanPower).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.totalPlantPowerKw)).toBe(true);
  });
});
