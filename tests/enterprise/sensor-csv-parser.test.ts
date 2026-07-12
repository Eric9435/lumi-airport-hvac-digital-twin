import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  calculateEffectiveCoolingLoadKw,
  calculateRequiredChillerCount,
  parseSensorCsv,
} from "@/lib/sensor-data/sensor-csv-parser";

const columns = [
  "timestamp",
  "passenger_count",
  "staff_count",
  "active_flights",
  "active_gates",
  "outdoor_dry_bulb_c",
  "outdoor_wet_bulb_c",
  "outdoor_rh_percent",
  "solar_load_percent",
  "lighting_load_kw",
  "equipment_load_kw",
  "ventilation_load_kw",
  "ahu_cooling_demand_percent",
  "chw_supply_temp_c",
  "chw_return_temp_c",
  "calculated_cooling_load_kw",

  "ahu_01_zone_temp_c",
  "ahu_01_setpoint_c",
  "ahu_01_cooling_valve_percent",

  "ahu_02_zone_temp_c",
  "ahu_02_setpoint_c",
  "ahu_02_cooling_valve_percent",

  "ahu_03_zone_temp_c",
  "ahu_03_setpoint_c",
  "ahu_03_cooling_valve_percent",

  "ahu_04_zone_temp_c",
  "ahu_04_setpoint_c",
  "ahu_04_cooling_valve_percent",

  "ahu_05_zone_temp_c",
  "ahu_05_setpoint_c",
  "ahu_05_cooling_valve_percent",

  "ahu_06_zone_temp_c",
  "ahu_06_setpoint_c",
  "ahu_06_cooling_valve_percent",

  "sensor_quality",
];

const validValues = [
  "2026-07-12T00:00:00+06:30",
  "200",
  "100",
  "4",
  "3",
  "30",
  "25",
  "75",
  "0",
  "16",
  "12",
  "10",
  "40",
  "7",
  "12",
  "80",

  "24",
  "23",
  "60",

  "23.5",
  "22.5",
  "55",

  "24",
  "23",
  "62",

  "24",
  "23.5",
  "50",

  "23",
  "22",
  "65",

  "24",
  "23",
  "58",

  "GOOD",
];

function buildCsv(overrides: Record<string, string> = {}): string {
  const row = columns.map((column, index) => {
    return overrides[column] ?? validValues[index];
  });

  return `${columns.join(",")}\n${row.join(",")}`;
}

describe("sensor CSV parser with AHU indoor data", () => {
  it("parses a valid row containing all six AHU groups", () => {
    const result = parseSensorCsv(buildCsv());

    expect(result.issues).toEqual([]);
    expect(result.validRowCount).toBe(1);
    expect(result.invalidRowCount).toBe(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];

    expect(row?.passengerCount).toBe(200);
    expect(row?.ahus).toHaveLength(6);
    expect(row?.ahus[0]?.id).toBe("AHU-01");
    expect(row?.ahus[5]?.id).toBe("AHU-06");
    expect(row?.averageZoneTemperatureC).toBeGreaterThan(0);
    expect(row?.effectiveCoolingLoadKw).toBeGreaterThan(80);
  });

  it("parses the generated 24-hour production sample CSV", () => {
    const csvPath = path.join(process.cwd(), "public/data/yia-24h-10min.csv");

    const csvText = fs.readFileSync(csvPath, "utf8");
    const result = parseSensorCsv(csvText);

    expect(result.sourceRowCount).toBe(144);
    expect(result.validRowCount).toBe(144);
    expect(result.invalidRowCount).toBe(0);
    expect(result.rows).toHaveLength(144);

    expect(result.rows[0]?.ahus).toHaveLength(6);
    expect(result.rows.at(-1)?.sensorQuality).toBe("GOOD");
  });

  it("rejects wet-bulb temperature above dry-bulb", () => {
    const result = parseSensorCsv(
      buildCsv({
        outdoor_dry_bulb_c: "25",
        outdoor_wet_bulb_c: "30",
      }),
    );

    expect(result.validRowCount).toBe(0);
    expect(result.invalidRowCount).toBe(1);

    expect(
      result.issues.some(
        (issue) =>
          issue.column === "outdoor_wet_bulb_c" && issue.severity === "error",
      ),
    ).toBe(true);
  });

  it("rejects an invalid AHU zone temperature", () => {
    const result = parseSensorCsv(
      buildCsv({
        ahu_01_zone_temp_c: "60",
      }),
    );

    expect(result.validRowCount).toBe(0);
    expect(result.invalidRowCount).toBe(1);

    expect(
      result.issues.some((issue) => issue.column === "ahu_01_zone_temp_c"),
    ).toBe(true);
  });

  it("rejects a missing required AHU column", () => {
    const incompleteColumns = columns.filter(
      (column) => column !== "ahu_06_cooling_valve_percent",
    );

    const incompleteValues = incompleteColumns.map(
      (column) => validValues[columns.indexOf(column)],
    );

    const result = parseSensorCsv(
      `${incompleteColumns.join(",")}\n${incompleteValues.join(",")}`,
    );

    expect(result.validRowCount).toBe(0);

    expect(
      result.issues.some(
        (issue) => issue.column === "ahu_06_cooling_valve_percent",
      ),
    ).toBe(true);
  });

  it("increases effective load for warm zones and open valves", () => {
    const effectiveLoad = calculateEffectiveCoolingLoadKw(100, 1.5, 80);

    expect(effectiveLoad).toBeGreaterThan(100);
    expect(effectiveLoad).toBeLessThanOrEqual(135);
  });

  it("does not reduce the uploaded base load", () => {
    expect(calculateEffectiveCoolingLoadKw(100, -1, 20)).toBe(100);
  });

  it("calculates required chiller count from effective load", () => {
    expect(calculateRequiredChillerCount(0)).toBe(0);
    expect(calculateRequiredChillerCount(40)).toBe(1);
    expect(calculateRequiredChillerCount(80)).toBe(2);
    expect(calculateRequiredChillerCount(120)).toBe(3);
    expect(calculateRequiredChillerCount(180)).toBe(4);
  });

  it("caps required chiller count at four", () => {
    expect(calculateRequiredChillerCount(1000)).toBe(4);
  });
});
