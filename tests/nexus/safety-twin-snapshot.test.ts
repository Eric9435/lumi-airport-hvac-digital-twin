import { describe, expect, it } from "vitest";

import { createSafetyTwinSnapshot } from "@/nexus/safety";

describe("Safety Twin snapshot", () => {
  it("creates a simulation-safe safety snapshot", async () => {
    const snapshot = await createSafetyTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);
    expect(snapshot.totalAssets).toBeGreaterThan(0);
    expect(snapshot.readinessScore).toBeGreaterThanOrEqual(0);
    expect(snapshot.readinessScore).toBeLessThanOrEqual(100);
  });

  it("keeps critical asset counts bounded", async () => {
    const snapshot = await createSafetyTwinSnapshot();

    expect(snapshot.criticalAssets).toBeLessThanOrEqual(snapshot.totalAssets);

    expect(snapshot.unavailableCriticalAssets).toBeLessThanOrEqual(
      snapshot.criticalAssets,
    );
  });

  it("requires human supervision", async () => {
    const snapshot = await createSafetyTwinSnapshot();

    expect(snapshot.controls.autonomousEmergencyControl).toBe(false);

    expect(snapshot.controls.physicalShutdownEnabled).toBe(false);

    expect(snapshot.controls.humanApprovalRequired).toBe(true);

    expect(snapshot.controls.fieldVerificationRequired).toBe(true);
  });

  it("assigns valid safety priorities", async () => {
    const snapshot = await createSafetyTwinSnapshot();

    const priorities = new Set(["critical", "high", "medium", "low"]);

    for (const asset of snapshot.assets) {
      expect(priorities.has(asset.safetyPriority)).toBe(true);
    }
  });
});
