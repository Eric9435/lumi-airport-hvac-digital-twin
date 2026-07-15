import { describe, expect, it } from "vitest";

import { createFlightOperationsTwinSnapshot } from "@/nexus/flight-operations";

describe("Flight Operations Twin snapshot", () => {
  it("creates a simulation-safe flight operations snapshot", async () => {
    const snapshot = await createFlightOperationsTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);

    expect(["api-derived", "fallback-model"]).toContain(snapshot.dataMode);

    expect(snapshot.totalFlights).toBeGreaterThanOrEqual(0);
  });

  it("keeps operational metrics non-negative", async () => {
    const snapshot = await createFlightOperationsTwinSnapshot();

    expect(snapshot.delayedFlights).toBeGreaterThanOrEqual(0);

    expect(snapshot.activeGates).toBeGreaterThanOrEqual(0);

    expect(snapshot.estimatedPassengers).toBeGreaterThanOrEqual(0);

    expect(snapshot.averageDelayMinutes).toBeGreaterThanOrEqual(0);
  });

  it("assigns valid pressure levels", async () => {
    const snapshot = await createFlightOperationsTwinSnapshot();

    const pressureLevels = new Set(["normal", "elevated", "high", "critical"]);

    for (const flight of snapshot.flights) {
      expect(pressureLevels.has(flight.pressureLevel)).toBe(true);
    }
  });

  it("does not enable autonomous airport control", async () => {
    const snapshot = await createFlightOperationsTwinSnapshot();

    expect(snapshot.coupling.autonomousDispatchEnabled).toBe(false);

    expect(snapshot.coupling.gateControlEnabled).toBe(false);

    expect(snapshot.coupling.humanApprovalRequired).toBe(true);
  });
});
