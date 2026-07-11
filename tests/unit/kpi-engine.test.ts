import { describe, expect, it } from "vitest";

import { calculateExecutiveKpis } from "@/lib/intelligence/kpi-engine";

import { initialPlantState } from "@/lib/simulation/initial-state";

describe("executive KPI engine", () => {
  it("generates a complete executive summary", () => {
    const result = calculateExecutiveKpis(initialPlantState);

    expect(result.plantPerformanceScore).toBeGreaterThanOrEqual(0);

    expect(result.plantPerformanceScore).toBeLessThanOrEqual(100);

    expect(result.assetPerformanceIndex).toBeGreaterThanOrEqual(0);

    expect(result.equipmentHealth.length).toBeGreaterThan(0);

    expect(result.reliability.totalAssets).toBe(result.equipmentHealth.length);

    expect(result.executiveSummary).toBeTruthy();
  });

  it("detects degraded AHU filter condition", () => {
    const degradedState = structuredClone(initialPlantState);

    degradedState.ahus[0] = {
      ...degradedState.ahus[0],

      filterDifferentialPressurePa: 300,

      alarmLevel: "high",

      alarmCode: "FILTER_DP_CRITICAL",
    };

    const result = calculateExecutiveKpis(degradedState);

    const ahu = result.equipmentHealth.find(
      (item) => item.equipmentId === degradedState.ahus[0].id,
    );

    expect(ahu).toBeDefined();

    expect(ahu?.healthScore).toBeLessThan(80);

    expect(
      result.predictiveMaintenance.some(
        (prediction) => prediction.equipmentId === degradedState.ahus[0].id,
      ),
    ).toBe(true);
  });

  it("calculates plant reliability metrics", () => {
    const result = calculateExecutiveKpis(initialPlantState);

    expect(result.reliability.availabilityPercent).toBeGreaterThanOrEqual(0);

    expect(result.reliability.availabilityPercent).toBeLessThanOrEqual(100);

    expect(result.reliability.estimatedMtbfHours).toBeGreaterThan(0);

    expect(result.reliability.estimatedMttrHours).toBeGreaterThan(0);
  });
});
