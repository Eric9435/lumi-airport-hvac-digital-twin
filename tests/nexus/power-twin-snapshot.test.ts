import { describe, expect, it } from "vitest";

import { createPowerTwinSnapshot } from "@/nexus/power";

describe("Power Twin snapshot", () => {
  it("creates a unified Power Twin dashboard snapshot", async () => {
    const snapshot = await createPowerTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);
    expect(snapshot.assetCount).toBe(7);
    expect(snapshot.transformerCount).toBe(4);
    expect(snapshot.generatorCount).toBe(1);
    expect(snapshot.atsCount).toBe(1);
  });

  it("calculates transformer loading metrics", async () => {
    const snapshot = await createPowerTwinSnapshot();

    expect(snapshot.averageTransformerLoadPercent).toBeCloseTo(52.5, 1);

    expect(snapshot.highestTransformerLoadPercent).toBe(60);
  });

  it("includes a deterministic Power Operations Agent finding", async () => {
    const snapshot = await createPowerTwinSnapshot();

    expect(snapshot.finding).not.toBeNull();
    expect(snapshot.finding?.agentId).toBe("power-operations-agent");
    expect(snapshot.finding?.sourceTwin).toBe("power");
    expect(snapshot.finding?.confidence).toBe(1);
  });

  it("does not expose autonomous physical control", async () => {
    const snapshot = await createPowerTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);

    expect(
      snapshot.finding?.recommendedActions.every(
        (action) => action.commandAction !== "power.breaker.execute",
      ),
    ).toBe(true);
  });
});
