import { describe, expect, it } from "vitest";

import { createNexusPlatformSnapshot } from "@/nexus/platform";

describe("Nexus platform snapshot", () => {
  it("creates a unified platform snapshot", async () => {
    const snapshot = await createNexusPlatformSnapshot();

    expect(snapshot.platform.name).toBe("LUMI Nexus");
    expect(snapshot.platform.architecture).toBe("modular-monolith");
    expect(snapshot.platform.simulationOnly).toBe(true);

    expect(snapshot.health.connectedDomains).toBe(7);
    expect(snapshot.health.enabledDomains).toBe(4);
    expect(snapshot.health.registeredNexusAssets).toBe(43);
    expect(snapshot.health.powerFoundationAssets).toBe(7);
    expect(snapshot.health.registeredAgents).toBeGreaterThanOrEqual(4);
  });

  it("reports HVAC as operational and new twins as foundations", async () => {
    const snapshot = await createNexusPlatformSnapshot();

    expect(
      snapshot.domains.find((domain) => domain.twinType === "hvac"),
    ).toMatchObject({
      maturity: "operational",
      enabled: true,
    });

    expect(
      snapshot.domains.find((domain) => domain.twinType === "power"),
    ).toMatchObject({
      maturity: "foundation",
      enabled: true,
    });
  });

  it("does not expose physical autonomous control", async () => {
    const snapshot = await createNexusPlatformSnapshot();

    expect(snapshot.platform.simulationOnly).toBe(true);

    expect(snapshot.agents.every((agent) => agent.deterministic)).toBe(true);
  });
});
