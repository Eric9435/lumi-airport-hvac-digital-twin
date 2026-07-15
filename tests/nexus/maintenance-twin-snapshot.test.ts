import { describe, expect, it } from "vitest";

import { createMaintenanceTwinSnapshot } from "@/nexus/maintenance";

describe("Maintenance Twin snapshot", () => {
  it("creates a cross-domain maintenance snapshot", async () => {
    const snapshot = await createMaintenanceTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);

    expect(snapshot.sourceAssetCount).toBeGreaterThan(0);

    expect(snapshot.monitoredAssetCount).toBe(snapshot.sourceAssetCount);
  });

  it("keeps maintenance counts within the asset inventory", async () => {
    const snapshot = await createMaintenanceTwinSnapshot();

    expect(snapshot.criticalAssetCount).toBeLessThanOrEqual(
      snapshot.monitoredAssetCount,
    );

    expect(snapshot.highPriorityAssetCount).toBeLessThanOrEqual(
      snapshot.monitoredAssetCount,
    );

    expect(snapshot.serviceDueCount).toBeLessThanOrEqual(
      snapshot.monitoredAssetCount,
    );
  });

  it("assigns every asset a valid maintenance priority", async () => {
    const snapshot = await createMaintenanceTwinSnapshot();

    const priorities = new Set(["critical", "high", "medium", "low"]);

    for (const asset of snapshot.assets) {
      expect(priorities.has(asset.priority)).toBe(true);
    }
  });

  it("does not fabricate maintenance cost when no cost metadata exists", async () => {
    const snapshot = await createMaintenanceTwinSnapshot();

    const configuredCostAssets = snapshot.assets.filter(
      (asset) => asset.estimatedMaintenanceCost !== null,
    );

    if (configuredCostAssets.length === 0) {
      expect(snapshot.estimatedMaintenanceCost).toBeNull();
    }
  });
});
