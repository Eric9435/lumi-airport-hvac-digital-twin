export const NEXUS_EVENT_TYPES = {
  EQUIPMENT_STARTED: "equipment.started",
  EQUIPMENT_STOPPED: "equipment.stopped",
  EQUIPMENT_FAULTED: "equipment.faulted",
  EQUIPMENT_RECOVERED: "equipment.recovered",

  ALARM_RAISED: "alarm.raised",
  ALARM_ACKNOWLEDGED: "alarm.acknowledged",
  ALARM_CLEARED: "alarm.cleared",

  PLANT_SEQUENCE_STARTED: "plant-sequence.started",
  PLANT_SEQUENCE_COMPLETED: "plant-sequence.completed",
  PLANT_SEQUENCE_FAILED: "plant-sequence.failed",

  SCENARIO_STARTED: "scenario.started",
  SCENARIO_COMPLETED: "scenario.completed",
  SCENARIO_FAILED: "scenario.failed",

  AGENT_FINDING_CREATED: "agent-finding.created",
  MAINTENANCE_RECOMMENDATION_CREATED: "maintenance-recommendation.created",

  APPROVAL_REQUESTED: "approval.requested",
  APPROVAL_APPROVED: "approval.approved",
  APPROVAL_REJECTED: "approval.rejected",
  APPROVAL_EXPIRED: "approval.expired",
  APPROVAL_EXECUTED: "approval.executed",
  APPROVAL_FAILED: "approval.failed",

  NEXUS_DOMAIN_CONNECTED: "nexus-domain.connected",
  NEXUS_DOMAIN_DISCONNECTED: "nexus-domain.disconnected",
} as const;

export type NexusEventType =
  (typeof NEXUS_EVENT_TYPES)[keyof typeof NEXUS_EVENT_TYPES];
