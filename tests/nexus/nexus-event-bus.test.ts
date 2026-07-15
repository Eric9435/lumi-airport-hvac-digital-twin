import { describe, expect, it, vi } from "vitest";

import { NexusEventBus } from "@/nexus/events/nexus-event-bus";
import { NEXUS_EVENT_TYPES } from "@/nexus/events/nexus-event-types";

describe("NexusEventBus", () => {
  it("publishes validated events and stores them in history", async () => {
    const eventBus = new NexusEventBus();

    const event = await eventBus.publish({
      sourceTwin: "hvac",
      assetId: "CH-01",
      eventType: NEXUS_EVENT_TYPES.EQUIPMENT_STARTED,
      severity: "info",
      correlationId: "correlation-001",
      payload: {
        requestedBy: "operator",
      },
      requiresHumanApproval: false,
    });

    expect(event.eventId).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.assetId).toBe("CH-01");
    expect(eventBus.getHistory()).toHaveLength(1);
  });

  it("delivers events only to matching subscriptions", async () => {
    const eventBus = new NexusEventBus();
    const hvacHandler = vi.fn();
    const powerHandler = vi.fn();

    eventBus.subscribe(
      {
        sourceTwin: "hvac",
      },
      hvacHandler,
    );

    eventBus.subscribe(
      {
        sourceTwin: "power",
      },
      powerHandler,
    );

    await eventBus.publish({
      sourceTwin: "hvac",
      assetId: "AHU-01",
      eventType: NEXUS_EVENT_TYPES.EQUIPMENT_STOPPED,
      severity: "info",
      correlationId: "correlation-002",
      payload: {},
      requiresHumanApproval: false,
    });

    expect(hvacHandler).toHaveBeenCalledOnce();
    expect(powerHandler).not.toHaveBeenCalled();
  });

  it("supports unsubscription", async () => {
    const eventBus = new NexusEventBus();
    const handler = vi.fn();

    const subscription = eventBus.subscribe({}, handler);

    subscription.unsubscribe();

    await eventBus.publish({
      sourceTwin: "hvac",
      eventType: NEXUS_EVENT_TYPES.PLANT_SEQUENCE_STARTED,
      severity: "info",
      correlationId: "correlation-003",
      payload: {},
      requiresHumanApproval: false,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(eventBus.getSubscriptionCount()).toBe(0);
  });

  it("keeps event history within the configured limit", async () => {
    const eventBus = new NexusEventBus({
      maxHistorySize: 3,
    });

    for (let index = 0; index < 5; index += 1) {
      await eventBus.publish({
        sourceTwin: "hvac",
        assetId: `CH-0${index + 1}`,
        eventType: NEXUS_EVENT_TYPES.EQUIPMENT_STARTED,
        severity: "info",
        correlationId: `correlation-${index}`,
        payload: {
          index,
        },
        requiresHumanApproval: false,
      });
    }

    const history = eventBus.getHistory();

    expect(history).toHaveLength(3);
    expect(history[0]?.payload.index).toBe(2);
    expect(history[2]?.payload.index).toBe(4);
  });

  it("filters event history", async () => {
    const eventBus = new NexusEventBus();

    await eventBus.publish({
      sourceTwin: "hvac",
      assetId: "CH-01",
      eventType: NEXUS_EVENT_TYPES.EQUIPMENT_STARTED,
      severity: "info",
      correlationId: "correlation-a",
      payload: {},
      requiresHumanApproval: false,
    });

    await eventBus.publish({
      sourceTwin: "power",
      assetId: "TR-01",
      eventType: NEXUS_EVENT_TYPES.EQUIPMENT_FAULTED,
      severity: "critical",
      correlationId: "correlation-b",
      payload: {},
      requiresHumanApproval: true,
    });

    expect(
      eventBus.getHistory({
        sourceTwin: "power",
      }),
    ).toHaveLength(1);

    expect(
      eventBus.getHistory({
        severity: "critical",
        requiresHumanApproval: true,
      }),
    ).toHaveLength(1);
  });

  it("isolates handler failures from other subscribers", async () => {
    const onHandlerError = vi.fn();

    const eventBus = new NexusEventBus({
      onHandlerError,
    });

    const successfulHandler = vi.fn();

    eventBus.subscribe({}, () => {
      throw new Error("Handler failure");
    });

    eventBus.subscribe({}, successfulHandler);

    await expect(
      eventBus.publish({
        sourceTwin: "hvac",
        eventType: NEXUS_EVENT_TYPES.ALARM_RAISED,
        severity: "high",
        correlationId: "correlation-error",
        payload: {},
        requiresHumanApproval: false,
      }),
    ).resolves.toBeDefined();

    expect(onHandlerError).toHaveBeenCalledOnce();
    expect(successfulHandler).toHaveBeenCalledOnce();
  });

  it("returns cloned history instead of mutable internal state", async () => {
    const eventBus = new NexusEventBus();

    await eventBus.publish({
      sourceTwin: "hvac",
      assetId: "AHU-01",
      eventType: NEXUS_EVENT_TYPES.ALARM_RAISED,
      severity: "medium",
      correlationId: "correlation-clone",
      payload: {
        alarmCode: "FILTER-DP-HIGH",
      },
      requiresHumanApproval: false,
    });

    const firstRead = eventBus.getHistory();

    firstRead[0]!.payload.alarmCode = "MODIFIED";

    const secondRead = eventBus.getHistory();

    expect(secondRead[0]?.payload.alarmCode).toBe("FILTER-DP-HIGH");
  });
});
