import { beforeEach, describe, expect, it } from "vitest";

import { createHvacNexusAssets } from "@/nexus/integrations/hvac/hvac-asset-adapter";
import { InMemoryNexusAssetRepository } from "@/nexus/registry/in-memory-nexus-asset-repository";
import { NexusAssetRegistry } from "@/nexus/registry/nexus-asset-registry";

describe("NexusAssetRegistry", () => {
  let registry: NexusAssetRegistry;

  beforeEach(() => {
    registry = new NexusAssetRegistry(new InMemoryNexusAssetRepository());
  });

  it("registers and retrieves an asset", async () => {
    const asset = await registry.register({
      id: "POWER-TR-01",
      name: "Main Transformer 01",
      twinType: "power",
      assetType: "transformer",
      siteId: "YIA",
      status: "online",
      healthScore: 95,
      criticality: "critical",
      metadata: {},
    });

    expect(await registry.getById(asset.id)).toEqual(asset);
  });

  it("updates an existing asset while preserving createdAt", async () => {
    const initialAsset = await registry.register({
      id: "CH-01",
      name: "Chiller 01",
      twinType: "hvac",
      assetType: "chiller",
      siteId: "YIA",
      status: "stopped",
      healthScore: 100,
      criticality: "critical",
      metadata: {},
    });

    const updatedAsset = await registry.register({
      id: "CH-01",
      name: "Chiller 01",
      twinType: "hvac",
      assetType: "chiller",
      siteId: "YIA",
      status: "running",
      healthScore: 97,
      criticality: "critical",
      metadata: {},
    });

    expect(updatedAsset.createdAt).toBe(initialAsset.createdAt);
    expect(updatedAsset.status).toBe("running");
    expect(updatedAsset.healthScore).toBe(97);
  });

  it("filters registered assets by twin and asset type", async () => {
    await registry.registerMany(createHvacNexusAssets());

    const chillers = await registry.list({
      twinType: "hvac",
      assetType: "chiller",
    });

    expect(chillers).toHaveLength(4);
    expect(chillers.every((asset) => asset.twinType === "hvac")).toBe(true);
  });

  it("creates the expected HVAC asset inventory", async () => {
    const assets = await registry.registerMany(createHvacNexusAssets());

    expect(assets).toHaveLength(36);
    expect(await registry.count({ assetType: "chiller" })).toBe(4);
    expect(await registry.count({ assetType: "air-handling-unit" })).toBe(6);
    expect(await registry.count({ assetType: "cooling-tower-fan" })).toBe(10);
  });

  it("does not expose mutable repository state", async () => {
    const registered = await registry.register({
      id: "AHU-01",
      name: "Air Handling Unit 01",
      twinType: "hvac",
      assetType: "air-handling-unit",
      siteId: "YIA",
      status: "running",
      healthScore: 88,
      criticality: "high",
      metadata: {
        zone: "Terminal",
      },
    });

    registered.metadata.zone = "Modified";

    const stored = await registry.getById("AHU-01");

    expect(stored?.metadata.zone).toBe("Terminal");
  });
});
