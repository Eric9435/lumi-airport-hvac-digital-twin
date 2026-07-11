import { describe, expect, it } from "vitest";

import { simulationScenarios } from "@/data/demo/simulation-scenarios";

import { applyScenario } from "@/lib/scenarios/scenario-engine";

import { initialPlantState } from "@/lib/simulation/initial-state";

describe("simulation scenario engine", () => {
  it("applies the peak-departure scenario", () => {
    const scenario = simulationScenarios.find(
      (item) => item.scenarioId === "SCN-PEAK-DEPARTURE",
    );

    expect(scenario).toBeDefined();

    const result = applyScenario(initialPlantState, scenario!);

    expect(result.operatingMode).toBe("boost");

    expect(result.expectedPassengers).toBeGreaterThan(
      initialPlantState.expectedPassengers,
    );

    const departureAhu = result.ahus.find((ahu) => ahu.id === "AHU-02");

    expect(departureAhu?.mode).toBe("boost");
  });

  it("injects a lead-chiller failure", () => {
    const scenario = simulationScenarios.find(
      (item) => item.scenarioId === "SCN-CHILLER-FAILURE",
    );

    expect(scenario).toBeDefined();

    const result = applyScenario(initialPlantState, scenario!);

    const failedChiller = result.chillers.find(
      (chiller) => chiller.id === "CH-01",
    );

    expect(failedChiller?.status).toBe("alarm");

    expect(failedChiller?.alarmCode).toBe("CHILLER_TRIP");

    expect(failedChiller?.powerKw).toBe(0);
  });
});
