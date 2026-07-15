import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const routeSource = readFileSync(
  resolve(process.cwd(), "src/app/api/nexus/replay/analytics/route.ts"),
  "utf8",
);

describe("Nexus Replay Analytics API route", () => {
  it("loads one synchronized replay bundle per request", () => {
    expect(routeSource).toContain("loadNexusReplayBundle()");

    const bundleLoadCount = (
      routeSource.match(/loadNexusReplayBundle\(\)/g) ?? []
    ).length;

    expect(bundleLoadCount).toBe(1);
  });

  it("supports index and timestamp selection", () => {
    expect(routeSource).toContain('searchParams.get("index")');

    expect(routeSource).toContain('searchParams.get("timestamp")');

    expect(routeSource).toContain("findNexusReplayIndex");
  });

  it("returns read-only simulated analytics", () => {
    expect(routeSource).toContain('runtimeMode: "dataset-replay"');

    expect(routeSource).toContain('dataOrigin: "simulated"');

    expect(routeSource).toContain("physicalControlEnabled: false");

    expect(routeSource).toContain('"Cache-Control": "no-store"');
  });
});
