import { z } from "zod";

export const flightScheduleRecordSchema = z.object({
  flightId: z.string().min(1),
  date: z.string().min(10),
  flightNumber: z.string().min(2),
  airline: z.string().min(1),
  movementType: z.enum(["arrival", "departure"]),
  scheduledTime: z.string().min(5),
  estimatedTime: z.string().nullable(),
  actualTime: z.string().nullable(),
  terminal: z.string().min(1),
  gate: z.string().min(1),
  aircraftType: z.string().min(1),
  expectedPassengers: z.number().int().min(0),
  actualPassengers: z.number().int().min(0).nullable(),
  status: z.enum([
    "scheduled",
    "boarding",
    "departed",
    "arrived",
    "delayed",
    "cancelled",
  ]),
  linkedZoneIds: z.array(z.string()),
  remarks: z.string(),
});

export const flightScheduleArraySchema = z.array(flightScheduleRecordSchema);

export const stateSyncRequestSchema = z.object({
  source: z.enum(["simulation", "lumi", "dashboard", "system"]),
  state: z.unknown(),
});

export const commandLogRequestSchema = z.object({
  requestedBy: z.string().min(1).max(100),
  commandSource: z.enum(["lumi", "dashboard", "automatic", "system"]),
  rawCommand: z.string().min(1).max(500),
  action: z.string().min(1).max(100),
  equipmentId: z.string().nullable(),
  parameter: z.string().nullable(),
  oldValue: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  requestedValue: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  unit: z.string().nullable(),
  reason: z.string().max(1000),
  executionStatus: z.enum(["pending", "executed", "failed", "cancelled"]),
  resultMessage: z.string().max(2000),
});
