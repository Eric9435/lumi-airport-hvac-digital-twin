import { describe, expect, it } from "vitest";

import { initialEnterprisePlantState } from "@/lib/enterprise/initial-enterprise-state";

describe("enterprise plant safe startup", () => {
  it("starts with automatic control disabled", () => {
    expect(initialEnterprisePlantState.automaticControlEnabled).toBe(false);

    expect(initialEnterprisePlantState.sequenceState).toBe("idle");
  });

  it("starts without synthetic demand", () => {
    expect(initialEnterprisePlantState.occupancy).toBe(0);

    expect(initialEnterprisePlantState.predictedCoolingLoadKw).toBe(0);

    expect(initialEnterprisePlantState.coolingDemandPercent).toBe(0);

    expect(initialEnterprisePlantState.requiredChillerCount).toBe(0);
  });

  it("starts all chiller groups in standby", () => {
    expect(
      initialEnterprisePlantState.groups.every(
        (group) =>
          group.status === "standby" && !group.selected && !group.required,
      ),
    ).toBe(true);
  });

  it("starts transformers de-energized", () => {
    expect(
      initialEnterprisePlantState.transformers.every(
        (transformer) =>
          transformer.status === "off" &&
          !transformer.incomingBreakerClosed &&
          !transformer.lvBreakerClosed &&
          transformer.powerKw === 0,
      ),
    ).toBe(true);
  });

  it("starts all pumps stopped", () => {
    const pumps = [
      ...initialEnterprisePlantState.primaryPumps,
      ...initialEnterprisePlantState.secondaryPumps,
      ...initialEnterprisePlantState.condenserPumps,
    ];

    expect(
      pumps.every(
        (pump) =>
          pump.status === "stopped" && !pump.flowProven && pump.powerKw === 0,
      ),
    ).toBe(true);
  });

  it("starts cooling towers and fans stopped", () => {
    expect(
      initialEnterprisePlantState.coolingTowers.every(
        (tower) =>
          tower.status === "stopped" &&
          tower.fans.every(
            (fan) => fan.status === "stopped" && fan.powerKw === 0,
          ),
      ),
    ).toBe(true);
  });
});
