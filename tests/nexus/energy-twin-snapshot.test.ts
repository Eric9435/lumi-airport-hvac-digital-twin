import { describe, expect, it } from "vitest";

import { createEnergyTwinSnapshot } from "@/nexus/energy";

describe("Energy Twin snapshot", () => {
  it("creates a simulation-safe energy snapshot", async () => {
    const snapshot = await createEnergyTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);
    expect(snapshot.modelDerived).toBe(true);
    expect(snapshot.sourceAssetCount).toBeGreaterThan(0);
  });

  it("produces non-negative energy metrics", async () => {
    const snapshot = await createEnergyTwinSnapshot();

    expect(snapshot.estimatedDemandKw).toBeGreaterThanOrEqual(0);

    expect(snapshot.estimatedDailyEnergyKwh).toBeGreaterThanOrEqual(0);

    expect(snapshot.estimatedMonthlyEnergyKwh).toBeGreaterThanOrEqual(0);
  });

  it("keeps contribution percentages bounded", async () => {
    const snapshot = await createEnergyTwinSnapshot();

    for (const contribution of snapshot.contributions) {
      expect(contribution.contributionPercent).toBeGreaterThanOrEqual(0);

      expect(contribution.contributionPercent).toBeLessThanOrEqual(100);
    }
  });

  it("does not fabricate financial values without a tariff", async () => {
    const snapshot = await createEnergyTwinSnapshot();

    if (snapshot.configuredTariffPerKwh === null) {
      expect(snapshot.estimatedMonthlyCost).toBeNull();
    }
  });
});
