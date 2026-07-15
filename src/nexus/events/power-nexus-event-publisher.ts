import { randomUUID } from "node:crypto";

import type { NexusEvent, NexusSeverity } from "@/nexus/contracts";
import { nexusEventBus } from "@/nexus/events/default-nexus-event-bus";
import { NEXUS_EVENT_TYPES } from "@/nexus/events/nexus-event-types";

export interface PublishPowerAssetEventInput {
  assetId: string;
  eventType:
    | typeof NEXUS_EVENT_TYPES.EQUIPMENT_STARTED
    | typeof NEXUS_EVENT_TYPES.EQUIPMENT_STOPPED
    | typeof NEXUS_EVENT_TYPES.EQUIPMENT_FAULTED
    | typeof NEXUS_EVENT_TYPES.EQUIPMENT_RECOVERED;
  severity?: NexusSeverity;
  correlationId?: string;
  causationId?: string;
  requiresHumanApproval?: boolean;
  payload?: Record<string, unknown>;
}

export async function publishPowerAssetEvent(
  input: PublishPowerAssetEventInput,
): Promise<NexusEvent> {
  return nexusEventBus.publish({
    sourceTwin: "power",
    assetId: input.assetId,
    eventType: input.eventType,
    severity: input.severity ?? "info",
    correlationId: input.correlationId ?? randomUUID(),
    causationId: input.causationId,
    payload: input.payload ?? {},
    requiresHumanApproval: input.requiresHumanApproval ?? false,
  });
}

export interface PublishPowerAlarmEventInput {
  assetId: string;
  alarmCode: string;
  alarmMessage: string;
  severity: NexusSeverity;
  state: "raised" | "acknowledged" | "cleared";
  correlationId?: string;
  causationId?: string;
  payload?: Record<string, unknown>;
}

export async function publishPowerAlarmEvent(
  input: PublishPowerAlarmEventInput,
): Promise<NexusEvent> {
  const eventTypeByState = {
    raised: NEXUS_EVENT_TYPES.ALARM_RAISED,
    acknowledged: NEXUS_EVENT_TYPES.ALARM_ACKNOWLEDGED,
    cleared: NEXUS_EVENT_TYPES.ALARM_CLEARED,
  } as const;

  return nexusEventBus.publish({
    sourceTwin: "power",
    assetId: input.assetId,
    eventType: eventTypeByState[input.state],
    severity: input.severity,
    correlationId: input.correlationId ?? randomUUID(),
    causationId: input.causationId,
    payload: {
      alarmCode: input.alarmCode,
      alarmMessage: input.alarmMessage,
      ...input.payload,
    },
    requiresHumanApproval: false,
  });
}
