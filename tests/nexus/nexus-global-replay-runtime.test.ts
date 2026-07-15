import { readFileSync } from "node:fs";

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(
  resolve(process.cwd(), "src/app/layout.tsx"),
  "utf8",
);

const hostSource = readFileSync(
  resolve(process.cwd(), "src/components/runtime/lumi-global-runtimes.tsx"),
  "utf8",
);

const runtimeSource = readFileSync(
  resolve(process.cwd(), "src/components/runtime/nexus-replay-runtime.tsx"),
  "utf8",
);

const consoleSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/nexus/replay/nexus-replay-console.tsx",
  ),
  "utf8",
);

describe("LUMI Nexus global replay runtime", () => {
  it("mounts exactly once through the root layout", () => {
    expect(layoutSource).toContain("<LumiGlobalRuntimes />");

    expect(hostSource).toContain("<NexusReplayRuntime />");

    expect((hostSource.match(/<NexusReplayRuntime \/>/g) ?? []).length).toBe(1);
  });

  it("owns automatic replay advancement globally", () => {
    expect(runtimeSource).toContain("const replayTimer =");

    expect(runtimeSource).toContain("selectedSpeed.delayMs");

    expect(runtimeSource).toContain('status !== "playing"');

    expect(consoleSource).not.toContain("selectedSpeed.delayMs");
  });

  it("publishes synchronized snapshots", () => {
    expect(runtimeSource).toContain("NEXUS_REPLAY_SNAPSHOT_EVENT");

    expect(runtimeSource).toContain("window.dispatchEvent");

    expect(consoleSource).toContain("handleRuntimeSnapshot");

    expect(consoleSource).toContain("window.addEventListener");
  });

  it("resumes the shared current index", () => {
    expect(consoleSource).toContain("loadSnapshot(currentIndex)");

    expect(consoleSource).not.toContain("void loadSnapshot(0)");
  });

  it("keeps physical control disabled", () => {
    expect(runtimeSource).toContain('runtimeMode: "dataset-replay"');

    expect(runtimeSource).toContain('dataOrigin: "simulated"');

    expect(runtimeSource).toContain("physicalControlEnabled: false");
  });
  it("restarts correctly after reset when the timestamp is cleared", () => {
    expect(runtimeSource).toContain(
      "loadedIndexRef.current === currentIndex &&",
    );
    expect(runtimeSource).toContain("timestamp !== null");
    expect(runtimeSource).toContain("if (timestamp === null)");
    expect(runtimeSource).toContain("void synchronizeSnapshot(currentIndex)");
  });
});
