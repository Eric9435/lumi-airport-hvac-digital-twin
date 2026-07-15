import { describe, expect, it } from "vitest";

import {
  analyzeNexusReplayDataset,
  analyzeNexusReplaySnapshot,
  loadNexusReplayAnalytics,
} from "../../src/lib/nexus/replay/nexus-replay-analytics";
import {
  getNexusReplaySnapshot,
  loadNexusReplayBundle,
  type NexusReplayDatasetSnapshot,
} from "../../src/lib/nexus/replay/nexus-replay-engine";

describe("LUMI Nexus Replay Analytics", () => {
  it("calculates analytics for a synthetic dataset", () => {
    const dataset: NexusReplayDatasetSnapshot = {
      datasetId: "test-domain",
      filename: "test-domain.csv",
      rowCount: 3,
      rows: [
        {
          timestamp: "2026-07-15T00:00:00.000Z",
          status: "running",
          power_kw: "10",
          temperature_c: "22",
        },
        {
          timestamp: "2026-07-15T00:00:00.000Z",
          status: "warning",
          power_kw: "20",
          temperature_c: "24",
        },
        {
          timestamp: "2026-07-15T00:00:00.000Z",
          status: "fault",
          power_kw: "30",
          temperature_c: "26",
        },
      ],
    };

    const analytics = analyzeNexusReplayDataset(dataset);

    expect(analytics.rowCount).toBe(3);
    expect(analytics.statusField).toBe("status");

    expect(analytics.statusDistribution).toEqual({
      fault: 1,
      running: 1,
      warning: 1,
    });

    expect(analytics.alertCount).toBe(2);

    expect(analytics.alertPercent).toBeCloseTo(66.67, 2);

    expect(analytics.numericMetrics).toEqual(
      expect.arrayContaining([
        {
          field: "power_kw",
          sampleCount: 3,
          minimum: 10,
          maximum: 30,
          average: 20,
        },
        {
          field: "temperature_c",
          sampleCount: 3,
          minimum: 22,
          maximum: 26,
          average: 24,
        },
      ]),
    );
  });

  it("analyzes a complete synchronized snapshot", () => {
    const bundle = loadNexusReplayBundle();

    const snapshot = getNexusReplaySnapshot(bundle, 0);

    const analytics = analyzeNexusReplaySnapshot(snapshot);

    expect(analytics.index).toBe(0);

    expect(analytics.timestamp).toBe("2026-07-15T00:00:00.000Z");

    expect(analytics.datasetCount).toBe(10);

    expect(analytics.totalRows).toBe(89);

    expect(analytics.datasets).toHaveLength(10);

    expect(analytics.numericMetricCount).toBeGreaterThan(0);

    expect(analytics.totalAlerts).toBeGreaterThanOrEqual(0);
  });

  it("loads analytics directly by replay index", () => {
    const analytics = loadNexusReplayAnalytics(72);

    expect(analytics.index).toBe(72);

    expect(analytics.timestamp).toBe("2026-07-15T12:00:00.000Z");

    expect(analytics.datasetCount).toBe(10);

    expect(analytics.totalRows).toBe(89);
  });

  it("keeps analytics read-only and simulated", () => {
    const analytics = loadNexusReplayAnalytics(143);

    expect(analytics.runtimeMode).toBe("dataset-replay");

    expect(analytics.dataOrigin).toBe("simulated");

    expect(analytics.physicalControlEnabled).toBe(false);
  });
});
