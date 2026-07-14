import { beforeEach, describe, expect, it } from "vitest";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";

describe("CSV plant sequence runtime", () => {
  beforeEach(() => {
    useEnterprisePlantStore.getState().reset();
    usePlantSequenceRuntime.getState().reset();
  });

  it("stages required groups instead of changing all equipment immediately", () => {
    usePlantSequenceRuntime.getState().requestSequence({
      targetChillers: 2,
      csvTimestamp: "2026-01-01T00:00:00.000Z",
      nextCsvTimestamp: "2026-01-01T00:10:00.000Z",
      csvIntervalSeconds: 600,
      replayIntervalMilliseconds: 2000,
    });

    expect(useEnterprisePlantStore.getState().transformers[0].status).toBe(
      "off",
    );
    expect(useEnterprisePlantStore.getState().groups[0].status).toBe(
      "starting",
    );
    expect(useEnterprisePlantStore.getState().groups[1].status).not.toBe(
      "running",
    );

    usePlantSequenceRuntime.getState().tick(700);

    expect(useEnterprisePlantStore.getState().groups[0].status).toBe("running");
    expect(useEnterprisePlantStore.getState().groups[1].status).not.toBe(
      "running",
    );

    usePlantSequenceRuntime.getState().tick(700);

    expect(
      useEnterprisePlantStore
        .getState()
        .groups.filter((group) => group.status === "running"),
    ).toHaveLength(2);
    expect(usePlantSequenceRuntime.getState().active).toBe(false);
  });

  it("runs a staged shutdown when the next CSV row lowers demand", () => {
    usePlantSequenceRuntime.getState().requestSequence({
      targetChillers: 2,
      csvTimestamp: "2026-01-01T00:00:00.000Z",
      nextCsvTimestamp: "2026-01-01T00:10:00.000Z",
      csvIntervalSeconds: 600,
      replayIntervalMilliseconds: 2000,
    });
    usePlantSequenceRuntime.getState().tick(1400);

    usePlantSequenceRuntime.getState().requestSequence({
      targetChillers: 1,
      csvTimestamp: "2026-01-01T00:10:00.000Z",
      nextCsvTimestamp: "2026-01-01T00:20:00.000Z",
      csvIntervalSeconds: 600,
      replayIntervalMilliseconds: 2000,
    });

    expect(useEnterprisePlantStore.getState().groups[1].status).toBe(
      "stopping",
    );

    usePlantSequenceRuntime.getState().tick(500);

    expect(useEnterprisePlantStore.getState().groups[0].status).toBe("running");
    expect(useEnterprisePlantStore.getState().groups[1].status).toBe("standby");
  });
  it("deduplicates CSV sequence events and identifies physical equipment", () => {
    usePlantSequenceRuntime.getState().requestSequence({
      targetChillers: 2,
      csvTimestamp: "2026-01-01T00:00:00.000Z",
      nextCsvTimestamp: "2026-01-01T00:10:00.000Z",
      csvIntervalSeconds: 600,
      replayIntervalMilliseconds: 10000,
    });

    usePlantSequenceRuntime.getState().tick(10000);
    usePlantSequenceRuntime.getState().tick(10000);

    const events = useEnterprisePlantStore.getState().sequenceEvents;
    const eventIds = events.map((event) => event.id);

    expect(events.length).toBeGreaterThan(0);
    expect(new Set(eventIds).size).toBe(eventIds.length);

    expect(events.some((event) => event.equipmentId === "TR-01")).toBe(true);

    expect(events.some((event) => event.equipmentId === "TR-02")).toBe(true);

    expect(events.some((event) => event.equipmentId === "CH-01")).toBe(true);
  });
});
