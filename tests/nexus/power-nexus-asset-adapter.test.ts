import { beforeEach, describe, expect, it } from "vitest";

import { powerTwinSeedAssets } from "@/domains/power";
import {
  adaptPowerAssetToNexus,
  createPowerNexusAssets,
} from "@/nexus/integrations/power";
import {
  InMemoryNexusAssetRepository,
  NexusAssetRegistry,
} from "@/nexus/registry";

describe("Power Nexus asset adapter", () => {
  let registry: NexusAssetRegistry;

  beforeEach(() => {
    registry = new NexusAssetRegistry(new InMemoryNexusAssetRepository());
  });

  it("maps all Power Twin seed assets into Nexus assets", () => {
    const assets = createPowerNexusAssets();

    expect(assets).toHaveLength(7);

    expect(assets.every((asset) => asset.twinType === "power")).toBe(true);
  });

  it("maps electrical status values to Nexus status values", () => {
    const utility = adaptPowerAssetToNexus(powerTwinSeedAssets[0]!);

    expect(utility.status).toBe("online");
    expect(utility.criticality).toBe("critical");
  });

  it("preserves electrical engineering metadata", () => {
    const transformerSeed = powerTwinSeedAssets.find(
      (asset) => asset.id === "POWER-TR-01",
    );

    expect(transformerSeed).toBeDefined();

    const transformer = adaptPowerAssetToNexus(transformerSeed!);

    expect(transformer.metadata).toMatchObject({
      source: "lumi-power-twin",
      operationalDomain: "airport-electrical-power",
      ratedVoltageV: 400,
      ratedPowerKva: 1250,
      loadPercent: 45,
      simulationOnly: true,
    });
  });

  it("registers and filters Power Twin assets centrally", async () => {
    await registry.registerMany(createPowerNexusAssets());

    expect(
      await registry.count({
        twinType: "power",
      }),
    ).toBe(7);

    expect(
      await registry.count({
        twinType: "power",
        assetType: "transformer",
      }),
    ).toBe(4);
  });

  it("supports unified HVAC and Power asset inventory", async () => {
    const { createHvacNexusAssets } =
      await import("@/nexus/integrations/hvac/hvac-asset-adapter");

    await registry.registerMany([
      ...createHvacNexusAssets(),
      ...createPowerNexusAssets(),
    ]);

    expect(await registry.count()).toBe(43);

    expect(
      await registry.count({
        twinType: "hvac",
      }),
    ).toBe(36);

    expect(
      await registry.count({
        twinType: "power",
      }),
    ).toBe(7);
  });
});
