import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/nexus/replay/page.tsx"),
  "utf8",
);

const componentSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/nexus/replay/nexus-replay-console.tsx",
  ),
  "utf8",
);

const replayStoreSource = readFileSync(
  resolve(process.cwd(), "src/store/nexus-replay-store.ts"),
  "utf8",
);

const normalizedComponentSource = componentSource.replace(/\s+/g, " ").trim();

describe("LUMI Nexus replay console", () => {
  it("provides the operational replay route", () => {
    expect(pageSource).toContain("Operational Replay Console");

    expect(pageSource).toContain(
      'import { NexusReplayConsole } from "@/components/nexus/replay/nexus-replay-console"',
    );

    expect(pageSource).toContain('id="lumi-main-content"');
  });

  it("loads synchronized snapshots from the replay API", () => {
    expect(componentSource).toContain("/api/nexus/replay?index=");

    expect(componentSource).toContain('cache: "no-store"');

    expect(componentSource).toContain("loadSnapshot(currentIndex)");
  });

  it("schedules initial replay loading outside the synchronous effect body", () => {
    expect(componentSource).toContain(
      "const initialLoadTimer = window.setTimeout",
    );

    expect(componentSource).toContain("void loadSnapshot(currentIndex)");

    expect(componentSource).toContain("window.clearTimeout(initialLoadTimer)");

    expect(componentSource).not.toContain(
      `useEffect(() => {
    void loadSnapshot(0);
  }, [loadSnapshot]);`,
    );
  });

  it("narrows replay API error responses before using snapshots", () => {
    expect(componentSource).toContain("function isReplayErrorResponse(");

    expect(componentSource).toContain("payload is ReplayErrorResponse");

    expect(componentSource).toContain("if (isReplayErrorResponse(payload))");

    expect(componentSource).toContain("setSnapshot(payload)");

    expect(componentSource).not.toContain("const errorPayload =");
  });

  it("uses the shared Zustand replay state", () => {
    expect(componentSource).toContain('from "@/store/nexus-replay-store"');

    expect(componentSource).toContain("useNexusReplayStore()");

    expect(componentSource).toContain("acceptSnapshot(");

    expect(componentSource).toContain("beginLoading()");

    expect(componentSource).not.toContain("setPlaying(");

    expect(componentSource).not.toContain("const [playing");
  });

  it("delegates automatic advancement to the global runtime", () => {
    expect(componentSource).toContain("NEXUS_REPLAY_SNAPSHOT_EVENT");

    expect(componentSource).toContain("handleRuntimeSnapshot");

    expect(componentSource).not.toContain("selectedSpeed.delayMs");

    expect(componentSource).not.toContain("void loadSnapshot(0)");
  });

  it("provides complete replay controls", () => {
    for (const control of [
      "Play",
      "Pause",
      "Previous",
      "Next",
      "Reset",
      "Replay timeline",
      "Replay speed",
    ]) {
      expect(componentSource).toContain(control);
    }
  });

  it("provides accelerated deterministic replay speeds through the shared store", () => {
    expect(componentSource).toContain("NEXUS_REPLAY_SPEED_OPTIONS");

    expect(componentSource).toContain("isNexusReplaySpeed");

    for (const speed of [60, 120, 600, 1200]) {
      expect(replayStoreSource).toContain(`value: ${speed}`);
    }

    for (const delay of [
      "delayMs: 10_000",
      "delayMs: 5_000",
      "delayMs: 1_000",
      "delayMs: 500",
    ]) {
      expect(replayStoreSource).toContain(delay);
    }
  });

  it("shows all synchronized domain datasets", () => {
    for (const domain of [
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

  it("keeps replay simulated and physical control disabled", () => {
    expect(componentSource).toContain('runtimeMode: "dataset-replay"');

    expect(componentSource).toContain('dataOrigin: "simulated"');

    expect(componentSource).toContain("physicalControlEnabled: false");

    expect(normalizedComponentSource).toContain(
      "Values are simulated, and physical equipment control remains disabled.",
    );
  });
});
