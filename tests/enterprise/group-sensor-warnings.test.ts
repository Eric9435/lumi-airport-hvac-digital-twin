import { describe, expect, it } from "vitest";

import { groupOperationalWarnings } from "@/lib/sensor-data/group-sensor-warnings";

import type {
  SensorCsvRow,
  SensorCsvValidationIssue,
} from "@/types/sensor-csv";

const rows = [
  {
    timestamp: "2026-07-12T00:00:00+06:30",
  },
  {
    timestamp: "2026-07-12T00:10:00+06:30",
  },
  {
    timestamp: "2026-07-12T00:20:00+06:30",
  },
] as SensorCsvRow[];

describe("operational warning grouping", () => {
  it("groups consecutive AHU valve warnings", () => {
    const issues: SensorCsvValidationIssue[] = [
      {
        rowNumber: 2,
        column: "ahu_cooling_valve_percent",
        message: "Average AHU cooling-valve demand is at or above 90%.",
        severity: "warning",
      },
      {
        rowNumber: 3,
        column: "ahu_cooling_valve_percent",
        message: "Average AHU cooling-valve demand is at or above 90%.",
        severity: "warning",
      },
      {
        rowNumber: 4,
        column: "ahu_cooling_valve_percent",
        message: "Average AHU cooling-valve demand is at or above 90%.",
        severity: "warning",
      },
    ];

    const grouped = groupOperationalWarnings(issues, rows);

    expect(grouped).toHaveLength(1);

    expect(grouped[0]?.occurrenceCount).toBe(3);

    expect(grouped[0]?.startRowNumber).toBe(2);

    expect(grouped[0]?.endRowNumber).toBe(4);
  });

  it("does not include validation errors", () => {
    const issues: SensorCsvValidationIssue[] = [
      {
        rowNumber: 2,
        column: "timestamp",
        message: "Invalid timestamp.",
        severity: "error",
      },
    ];

    expect(groupOperationalWarnings(issues, rows)).toEqual([]);
  });
});
