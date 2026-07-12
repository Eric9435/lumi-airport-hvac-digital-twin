import { describe, expect, it } from "vitest";

import {
  calculateEffectiveCoolingLoadKw,
  calculateRequiredChillerCount,
} from "@/lib/sensor-data/sensor-csv-parser";

describe("dashboard AHU sensor calculations", () => {
  it("uses effective cooling load for staging", () => {
    const baseLoadKw = 80;

    const effectiveLoadKw = calculateEffectiveCoolingLoadKw(
      baseLoadKw,
      1.5,
      80,
    );

    expect(effectiveLoadKw).toBeGreaterThan(baseLoadKw);

    expect(
      calculateRequiredChillerCount(effectiveLoadKw),
    ).toBeGreaterThanOrEqual(2);
  });

  it("keeps chiller count within plant limits", () => {
    expect(calculateRequiredChillerCount(0)).toBe(0);

    expect(calculateRequiredChillerCount(10000)).toBe(4);
  });
});
