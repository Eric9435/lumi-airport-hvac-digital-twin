import { describe, expect, it } from "vitest";

import {
  calculateEnergyPerformance,
  defaultCarbonFactor,
  defaultEnergyTariff,
  hvacSimulationBaseline,
} from "@/domains/energy";
import {
  calculateMaintenanceCost,
  calculateMtbfHours,
  calculateMttrHours,
} from "@/domains/maintenance";
import {
  InMemoryPowerAssetRepository,
  powerTwinSeedAssets,
} from "@/domains/power";
import { getNexusDomain, listNexusDomains } from "@/nexus/domains";

describe("Nexus domain foundations", () => {
  it("loads the Power Twin foundation assets", async () => {
    const repository = new InMemoryPowerAssetRepository();

    const assets = await repository.saveMany(powerTwinSeedAssets);

    expect(assets).toHaveLength(7);
    expect(
      await repository.count({
        assetType: "transformer",
      }),
    ).toBe(4);

    expect(await repository.findById("POWER-GEN-01")).toMatchObject({
      assetType: "generator",
      status: "standby",
    });
  });

  it("calculates the configured LUMI energy result", () => {
    const result = calculateEnergyPerformance({
      actualEnergyKwh: 1819.9,
      baselineEnergyKwh: hvacSimulationBaseline.baselineEnergyKwh,
      tariffPerKwh: defaultEnergyTariff.energyRatePerKwh,
      carbonFactorKgCo2ePerKwh: defaultCarbonFactor.kgCo2ePerKwh,
    });

    expect(result.energySavingKwh).toBeCloseTo(218.39, 2);

    expect(result.energySavingPercent).toBeCloseTo(10.714, 3);

    expect(result.estimatedCostSaving).toBeCloseTo(196551, 0);

    expect(result.estimatedAvoidedCarbonKgCo2e).toBeCloseTo(98.2755, 4);

    expect(result.modelDerived).toBe(true);
  });

  it("calculates maintenance and downtime cost", () => {
    const result = calculateMaintenanceCost({
      labourHours: 8,
      labourRatePerHour: 15000,
      sparePartsCost: 250000,
      externalServiceCost: 50000,
      downtimeHours: 2,
      downtimeCostPerHour: 100000,
      currency: "MMK",
    });

    expect(result.labourCost).toBe(120000);
    expect(result.downtimeCost).toBe(200000);
    expect(result.totalEstimatedCost).toBe(620000);
  });

  it("calculates MTBF and MTTR", () => {
    expect(calculateMtbfHours(1000, 4)).toBe(250);
    expect(calculateMtbfHours(1000, 0)).toBeNull();

    expect(calculateMttrHours(12, 3)).toBe(4);
    expect(calculateMttrHours(0, 0)).toBeNull();
  });

  it("reports domain maturity accurately", () => {
    const domains = listNexusDomains();

    expect(domains).toHaveLength(7);

    expect(getNexusDomain("hvac")).toMatchObject({
      maturity: "operational",
      enabled: true,
    });

    expect(getNexusDomain("power")).toMatchObject({
      maturity: "foundation",
      enabled: true,
    });

    expect(getNexusDomain("passenger-flow")).toMatchObject({
      maturity: "planned",
      enabled: false,
    });
  });

  it("does not expose mutable domain registry state", () => {
    const firstRead = listNexusDomains();

    firstRead[0]!.name = "Modified";

    const secondRead = listNexusDomains();

    expect(secondRead[0]?.name).toBe("LUMI HVAC Twin");
  });
});
