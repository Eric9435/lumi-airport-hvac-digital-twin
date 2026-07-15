import { describe, expect, it } from "vitest";

import {
  findNexusReplayIndex,
  getNexusReplaySnapshot,
  getNexusReplaySnapshotByTimestamp,
  loadNexusReplayBundle,
} from "../../src/lib/nexus/replay/nexus-replay-engine";

describe("LUMI Nexus synchronized replay engine", () => {
  it("loads one synchronized 24-hour timeline", () => {
    const bundle = loadNexusReplayBundle();

    expect(bundle.platform).toBe("LUMI Nexus");

    expect(bundle.runtimeMode).toBe("dataset-replay");

    expect(bundle.dataOrigin).toBe("simulated");

    expect(bundle.physicalControlEnabled).toBe(false);

    expect(bundle.intervalMinutes).toBe(10);

    expect(bundle.snapshotCount).toBe(144);

    expect(bundle.timestamps).toHaveLength(144);

    expect(bundle.timestamps[0]).toBe("2026-07-15T00:00:00.000Z");

    expect(bundle.timestamps.at(-1)).toBe("2026-07-15T23:50:00.000Z");
  });

  it("returns all domain rows for the first synchronized snapshot", () => {
    const bundle = loadNexusReplayBundle();

    const snapshot = getNexusReplaySnapshot(bundle, 0);

    expect(snapshot.index).toBe(0);

    expect(snapshot.timestamp).toBe("2026-07-15T00:00:00.000Z");

    expect(snapshot.previousTimestamp).toBeNull();

    expect(snapshot.nextTimestamp).toBe("2026-07-15T00:10:00.000Z");

    expect(snapshot.datasetCount).toBe(10);

    expect(snapshot.totalRows).toBe(89);

    expect(snapshot.complete).toBe(false);

    expect(snapshot.progressPercent).toBeCloseTo(0.69, 2);
  });

  it("returns the final synchronized snapshot correctly", () => {
    const bundle = loadNexusReplayBundle();

    const snapshot = getNexusReplaySnapshot(bundle, 143);

    expect(snapshot.index).toBe(143);

    expect(snapshot.timestamp).toBe("2026-07-15T23:50:00.000Z");

    expect(snapshot.nextTimestamp).toBeNull();

    expect(snapshot.previousTimestamp).toBe("2026-07-15T23:40:00.000Z");

    expect(snapshot.complete).toBe(true);

    expect(snapshot.progressPercent).toBe(100);

    expect(snapshot.totalRows).toBe(89);
  });

  it("finds snapshots by timestamp", () => {
    const bundle = loadNexusReplayBundle();

    expect(findNexusReplayIndex(bundle, "2026-07-15T12:00:00.000Z")).toBe(72);

    const snapshot = getNexusReplaySnapshotByTimestamp(
      bundle,
      "2026-07-15T12:00:00Z",
    );

    expect(snapshot.index).toBe(72);

    expect(snapshot.timestamp).toBe("2026-07-15T12:00:00.000Z");
  });

  it("rejects invalid replay indexes", () => {
    const bundle = loadNexusReplayBundle();

    expect(() => getNexusReplaySnapshot(bundle, -1)).toThrow(RangeError);

    expect(() => getNexusReplaySnapshot(bundle, 144)).toThrow(RangeError);
  });

  it("contains rows from every registered domain dataset", () => {
    const bundle = loadNexusReplayBundle();

    const snapshot = getNexusReplaySnapshot(bundle, 48);

    const filenames = snapshot.datasets.map((dataset) => dataset.filename);

    expect(filenames).toEqual(
      expect.arrayContaining([
        "yia-power-distribution-24h-10min.csv",
        "yia-emergency-power-24h-10min.csv",
        "yia-energy-utilities-24h-10min.csv",
        "yia-safety-systems-24h-10min.csv",
        "yia-passenger-flow-24h-10min.csv",
        "yia-flight-operations-24h-10min.csv",
        "yia-baggage-operations-24h-10min.csv",
        "yia-airport-environment-24h-10min.csv",
        "yia-building-infrastructure-24h-10min.csv",
        "yia-platform-health-24h-10min.csv",
      ]),
    );

    for (const dataset of snapshot.datasets) {
      expect(dataset.rowCount).toBeGreaterThan(0);
    }
  });
});
