import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseAhuEnvironmentCsv,
  parseAlarmEventsCsv,
  parseEquipmentConditionCsv,
} from "@/lib/industrial-data/industrial-csv-parser";

function readDataFile(filename: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), "public/data", filename),
    "utf8",
  );
}

describe("industrial CSV parsers", () => {
  it("parses the complete AHU environment dataset", () => {
    const result = parseAhuEnvironmentCsv(
      readDataFile("yia-ahu-environment-24h-10min.csv"),
    );

    expect(result.invalidRowCount).toBe(0);

    expect(result.validRowCount).toBe(864);

    expect(result.rows[0]?.equipmentId).toBe("AHU-01");
  });

  it("parses the complete equipment-condition dataset", () => {
    const result = parseEquipmentConditionCsv(
      readDataFile("yia-equipment-condition-24h-10min.csv"),
    );

    expect(result.invalidRowCount).toBe(0);

    expect(result.validRowCount).toBe(3168);
  });

  it("parses alarm events", () => {
    const result = parseAlarmEventsCsv(
      readDataFile("yia-alarm-events-24h.csv"),
    );

    expect(result.invalidRowCount).toBe(0);

    expect(result.validRowCount).toBe(3);
  });
});
