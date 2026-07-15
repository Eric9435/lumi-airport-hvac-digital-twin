import { describe, expect, it } from "vitest";

import { createPassengerFlowTwinSnapshot } from "@/nexus/passenger-flow";

describe("Passenger Flow Twin snapshot", () => {
  it("creates a simulation-safe passenger-flow snapshot", async () => {
    const snapshot = await createPassengerFlowTwinSnapshot();

    expect(snapshot.simulationOnly).toBe(true);
    expect(snapshot.modelDerived).toBe(true);
    expect(snapshot.totalZones).toBeGreaterThan(0);
  });

  it("keeps passenger and flow values non-negative", async () => {
    const snapshot = await createPassengerFlowTwinSnapshot();

    expect(snapshot.estimatedPassengers).toBeGreaterThanOrEqual(0);

    expect(snapshot.estimatedArrivalRatePerHour).toBeGreaterThanOrEqual(0);

    expect(snapshot.estimatedDepartureRatePerHour).toBeGreaterThanOrEqual(0);
  });

  it("assigns valid flow levels", async () => {
    const snapshot = await createPassengerFlowTwinSnapshot();

    const levels = new Set(["normal", "elevated", "high", "critical"]);

    for (const zone of snapshot.zones) {
      expect(levels.has(zone.flowLevel)).toBe(true);
    }
  });

  it("does not enable autonomous operational controls", async () => {
    const snapshot = await createPassengerFlowTwinSnapshot();

    expect(snapshot.controls.autonomousPassengerRouting).toBe(false);

    expect(snapshot.controls.gateControlEnabled).toBe(false);

    expect(snapshot.controls.publicAnnouncementControlEnabled).toBe(false);

    expect(snapshot.controls.humanApprovalRequired).toBe(true);
  });
});
