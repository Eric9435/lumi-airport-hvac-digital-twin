import { describe, expect, it } from "vitest";

import {
  getCsvIntervalSeconds,
  getReplayIntervalMilliseconds,
} from "@/lib/sensor-data/replay-timing";

import type { SensorCsvRow } from "@/types/sensor-csv";

function row(timestamp: string): SensorCsvRow {
  return { timestamp } as SensorCsvRow;
}

describe("CSV replay timing", () => {
  it("reads the ten-minute interval from adjacent CSV timestamps", () => {
    expect(
      getCsvIntervalSeconds(
        [row("2026-01-01T00:00:00.000Z"), row("2026-01-01T00:10:00.000Z")],
        0,
      ),
    ).toBe(600);
  });

  it("scales replay wall-clock timing with the selected speed", () => {
    expect(getReplayIntervalMilliseconds(1)).toBe(10000);
    expect(getReplayIntervalMilliseconds(2)).toBe(5000);
    expect(getReplayIntervalMilliseconds(10)).toBe(1000);
  });
});
