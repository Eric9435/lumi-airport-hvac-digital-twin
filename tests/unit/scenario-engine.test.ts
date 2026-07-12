import { describe, expect, it } from "vitest";

import { simulationScenarios } from "@/data/demo/simulation-scenarios";
import { applyScenario } from "@/lib/scenarios/scenario-engine";
import { initialPlantState } from "@/lib/simulation/initial-state";

import type { PlantState } from "@/types/hvac";

function createScenarioBaseline(): PlantState {
  return {
    ...initialPlantState,
    simulationRunning: false,
    expectedPassengers: 1000,

    flightDemand: {
      ...initialPlantState.flightDemand,
      currentFlights: 4,
      flightsNextHour: 5,
      flightsNextTwoHours: 8,
      expectedPassengers: 1000,
      arrivalPassengers: 450,
      departurePassengers: 550,
      demandLevel: "normal",
    },

    ahus: initialPlantState.ahus.map((ahu) => ({
      ...ahu,
      status: "running",
      mode: "automatic",
      fanSpeedPercent: 60,
      airflowCmh: Math.round(ahu.designAirflowCmh * 0.6),
      powerKw: 2,
      occupancy: Math.round(1000 / initialPlantState.ahus.length),
    })),
  };
}

describe("simulation scenario engine", () => {
  it("applies the peak-departure scenario to an operating baseline", () => {
    const scenario = simulationScenarios.find(
      (item) => item.scenarioId === "SCN-PEAK-DEPARTURE",
    );

    expect(scenario).toBeDefined();

    const baseline = createScenarioBaseline();

    const result = applyScenario(baseline, scenario!);

    expect(result.operatingMode).toBe("boost");

    expect(result.expectedPassengers).toBeGreaterThan(
      baseline.expectedPassengers,
    );

    expect(result.flightDemand.expectedPassengers).toBe(
      result.expectedPassengers,
    );

    const departureAhu = result.ahus.find((ahu) => ahu.id === "AHU-02");

    expect(departureAhu?.mode).toBe("boost");

    expect(departureAhu?.fanSpeedPercent).toBeGreaterThan(60);
  });

  it("injects a lead-chiller failure", () => {
    const scenario = simulationScenarios.find(
      (item) => item.scenarioId === "SCN-CHILLER-FAILURE",
    );

    expect(scenario).toBeDefined();

    const baseline = createScenarioBaseline();

    const result = applyScenario(baseline, scenario!);

    const failedChiller = result.chillers.find(
      (chiller) => chiller.id === "CH-01",
    );

    expect(failedChiller?.status).toBe("alarm");

    expect(failedChiller?.alarmCode).toBe("CHILLER_TRIP");

    expect(failedChiller?.powerKw).toBe(0);
  });
});
