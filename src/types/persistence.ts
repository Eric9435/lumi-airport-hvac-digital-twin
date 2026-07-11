import type { AlarmLevel, PlantState } from "@/types/hvac";

export type FlightMovementType = "arrival" | "departure";

export type FlightOperationalStatus =
  "scheduled" | "boarding" | "departed" | "arrived" | "delayed" | "cancelled";

export interface FlightScheduleRecord {
  flightId: string;
  date: string;
  flightNumber: string;
  airline: string;
  movementType: FlightMovementType;
  scheduledTime: string;
  estimatedTime: string | null;
  actualTime: string | null;
  terminal: string;
  gate: string;
  aircraftType: string;
  expectedPassengers: number;
  actualPassengers: number | null;
  status: FlightOperationalStatus;
  linkedZoneIds: string[];
  remarks: string;
}

export interface CommandLogRecord {
  commandId: string;
  requestedAt: string;
  requestedBy: string;
  commandSource: "lumi" | "dashboard" | "automatic" | "system";
  rawCommand: string;
  action: string;
  equipmentId: string | null;
  parameter: string | null;
  oldValue: string | number | boolean | null;
  requestedValue: string | number | boolean | null;
  unit: string | null;
  reason: string;
  approvalRequired: boolean;
  approvalStatus: "not-required" | "pending" | "approved" | "rejected";
  executionStatus: "pending" | "executed" | "failed" | "cancelled";
  resultMessage: string;
  executedAt: string | null;
}

export interface AlertRecord {
  alertId: string;
  detectedAt: string;
  equipmentId: string;
  zoneId: string | null;
  parameter: string;
  measuredValue: number | string;
  normalMinimum: number | null;
  normalMaximum: number | null;
  alarmLevel: AlarmLevel;
  alarmCode: string;
  alertMessage: string;
  probableCause: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNote: string;
}

export interface StateSnapshotRecord {
  snapshotId: string;
  timestamp: string;
  source: "simulation" | "lumi" | "dashboard" | "system";
  state: PlantState;
}

export interface AppsScriptRequest<T = unknown> {
  action: string;
  requestId: string;
  timestamp: string;
  apiKey?: string;
  payload?: T;
}

export interface AppsScriptResponse<T = unknown> {
  success: boolean;
  requestId?: string;
  timestamp?: string;
  data?: T;
  error?: string;
}
