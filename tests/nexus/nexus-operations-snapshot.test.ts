import { describe, expect, it } from "vitest";

import { createNexusOperationsSnapshot } from "@/nexus/operations";

describe("Nexus Operations snapshot", () => {
  it("creates a unified operations snapshot", async () => {
    const snapshot = await createNexusOperationsSnapshot();

    expect(["operational", "degraded"]).toContain(snapshot.platformStatus);

    expect(snapshot.registeredAssets).toBeGreaterThan(0);

    expect(snapshot.registeredAgents).toBeGreaterThan(0);
  });

  it("keeps event counters bounded", async () => {
    const snapshot = await createNexusOperationsSnapshot();

    expect(snapshot.criticalEventCount).toBeLessThanOrEqual(
      snapshot.eventCount,
    );

    expect(snapshot.approvalRequiredEventCount).toBeLessThanOrEqual(
      snapshot.eventCount,
    );
  });

  it("keeps physical autonomous control disabled", async () => {
    const snapshot = await createNexusOperationsSnapshot();

    expect(snapshot.controls.autonomousPhysicalControl).toBe(false);

    expect(snapshot.controls.humanApprovalWorkflow).toBe(true);

    expect(snapshot.controls.deterministicAgentRuntime).toBe(true);
  });
});
