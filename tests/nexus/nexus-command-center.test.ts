import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/nexus/page.tsx"),
  "utf8",
);

const componentSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/nexus/command-center/nexus-command-center.tsx",
  ),
  "utf8",
);

describe("LUMI Nexus Unified Command Center", () => {
  it("renders the professional unified command center route", () => {
    expect(pageSource).toContain("NexusCommandCenter");
    expect(pageSource).toContain("LUMI Nexus Unified Command Center");
    expect(componentSource).toContain('id="lumi-main-content"');
  });

  it("subscribes to the global replay runtime", () => {
    expect(componentSource).toContain(
      'const SNAPSHOT_EVENT = "lumi:nexus-replay-snapshot"',
    );
    expect(componentSource).toContain("window.addEventListener");
    expect(componentSource).toContain("window.removeEventListener");
    expect(componentSource).toContain("useNexusReplayStore()");
  });

  it("schedules analytics loading outside the synchronous effect body", () => {
    expect(componentSource).toContain(
      "const analyticsTimer = window.setTimeout",
    );

    expect(componentSource).toContain("window.clearTimeout(analyticsTimer)");

    expect(componentSource).not.toContain(
      `useEffect(() => {
    void loadAnalytics(currentIndex);
  }, [currentIndex, loadAnalytics]);`,
    );
  });

  it("loads synchronized replay analytics", () => {
    expect(componentSource).toContain("/api/nexus/replay/analytics?index=");
    expect(componentSource).toContain('cache: "no-store"');
    expect(componentSource).toContain("isReplayAnalytics");
  });

  it("provides live runtime controls", () => {
    for (const control of [
      "Play",
      "Pause",
      "Reset",
      "Speed",
      "NEXUS_REPLAY_SPEED_OPTIONS",
    ]) {
      expect(componentSource).toContain(control);
    }
  });

  it("provides professional animated charts", () => {
    for (const chart of [
      "AreaChart",
      "LineChart",
      "BarChart",
      "ResponsiveContainer",
      "Cross-domain runtime activity",
      "Alert timeline",
      "Domain alert distribution",
      "Primary domain metrics",
    ]) {
      expect(componentSource).toContain(chart);
    }

    expect(componentSource).toContain("motion.");
    expect(componentSource).toContain("Animated Domain Runtime Topology");
  });

  it("shows runtime diagnostics and safety boundaries", () => {
    expect(componentSource).toContain("Runtime Diagnostics");
    expect(componentSource).toContain("NexusReplayRuntime");
    expect(componentSource).toContain("LumiGlobalRuntimes");
    expect(componentSource).toContain("Physical control");
    expect(componentSource).toContain("Disabled");
    expect(componentSource).toContain("Values are simulated");
  });

  it("shows all-domain runtime intelligence", () => {
    for (const domain of [
      "HVAC Digital Twin",
      "Power Distribution",
      "Emergency Power",
      "Energy & Utilities",
      "Safety Systems",
      "Passenger Flow",
      "Flight Operations",
      "Baggage Operations",
      "Airport Environment",
      "Building Infrastructure",
      "Platform Health",
    ]) {
      expect(componentSource).toContain(domain);
    }
  });
});
