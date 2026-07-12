import { describe, expect, it } from "vitest";

import {
  calculateRequiredChillerCount,
  parseSensorCsv,
} from "@/lib/sensor-data/sensor-csv-parser";

const header =
  "timestamp,passenger_count,staff_count,active_flights,active_gates,outdoor_dry_bulb_c,outdoor_wet_bulb_c,outdoor_rh_percent,solar_load_percent,lighting_load_kw,equipment_load_kw,ventilation_load_kw,ahu_cooling_demand_percent,chw_supply_temp_c,chw_return_temp_c,calculated_cooling_load_kw,sensor_quality";

const validRow =
  "2026-07-12T00:00:00+06:30,200,100,4,3,30,25,75,0,16,12,10,40,7,12,80,GOOD";

describe("sensor CSV parser", () => {
  it("parses a valid sensor row", () => {
    const result = parseSensorCsv(`${header}\n${validRow}`);

    expect(result.validRowCount).toBe(1);
    expect(result.invalidRowCount).toBe(0);
    expect(result.rows[0]?.passengerCount).toBe(200);
  });

  it("rejects wet bulb above dry bulb", () => {
    const invalidRow =
      "2026-07-12T00:00:00+06:30,200,100,4,3,25,30,75,0,16,12,10,40,7,12,80,GOOD";

    const result = parseSensorCsv(`${header}\n${invalidRow}`);

    expect(result.invalidRowCount).toBe(1);
  });

  it("rejects missing required columns", () => {
    const result = parseSensorCsv(
      "timestamp,passenger_count\n2026-07-12T00:00:00+06:30,200",
    );

    expect(result.validRowCount).toBe(0);
    expect(
      result.issues.some(
        (issue) => issue.column === "calculated_cooling_load_kw",
      ),
    ).toBe(true);
  });

  it("calculates required chiller count from load", () => {
    expect(calculateRequiredChillerCount(40)).toBe(1);

    expect(calculateRequiredChillerCount(80)).toBe(2);

    expect(calculateRequiredChillerCount(120)).toBe(3);

    expect(calculateRequiredChillerCount(180)).toBe(4);
  });

  it("caps required chillers at four", () => {
    expect(calculateRequiredChillerCount(1000)).toBe(4);
  });
});
