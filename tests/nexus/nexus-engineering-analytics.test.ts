import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const panelSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/nexus/command-center/nexus-engineering-analytics.tsx",
  ),
  "utf8",
);

const commandCenterSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/nexus/command-center/nexus-command-center.tsx",
  ),
  "utf8",
);

describe("Nexus advanced engineering analytics", () => {
  it("is mounted in the unified command center", () => {
    expect(commandCenterSource).toContain("NexusEngineeringAnalytics");
    expect(commandCenterSource).toContain("<NexusEngineeringAnalytics />");
  });

  it("uses the shared replay state without creating a replay timer", () => {
    expect(panelSource).toContain("useNexusReplayStore");
    expect(panelSource).toContain("lumi:nexus-replay-snapshot");
    expect(panelSource).not.toContain("NEXUS_REPLAY_SPEED_OPTIONS");
    expect(panelSource).not.toContain("currentIndex + 1");
  });

  it("loads synchronized analytics using the current replay index", () => {
    expect(panelSource).toContain("/api/nexus/replay/analytics?index=");
    expect(panelSource).toContain('cache: "no-store"');
  });

  it("provides unit-aware engineering metrics", () => {
    for (const metric of [
      "powerKw",
      "energyKwh",
      "temperatureC",
      "loadPercent",
      "passengerCount",
      "flightDelayMinutes",
      "assetHealthPercent",
    ]) {
      expect(panelSource).toContain(metric);
    }
  });

  it("provides advanced operational graphs", () => {
    for (const graph of [
      "Airport Power Demand",
      "Energy Consumption",
      "HVAC Thermal and Load Conditions",
      "Passenger and Flight Demand",
      "Asset Reliability",
      "Current Domain Alert Exposure",
    ]) {
      expect(panelSource).toContain(graph);
    }
  });

  it("does not invent missing engineering values", () => {
    expect(panelSource).toContain("Not mapped");
    expect(panelSource).toContain("The system does not invent");
  });

  it("preserves the simulation safety boundary", () => {
    expect(panelSource).toContain(
      "physical equipment control remains disabled",
    );
  });
});
