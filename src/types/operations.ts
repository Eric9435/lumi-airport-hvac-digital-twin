import type { AlarmLevel, OperatingMode, PlantState } from "@/types/hvac";

export type ScenarioStatus =
  "available" | "running" | "completed" | "cancelled";

export type ScenarioCategory =
  | "normal-operation"
  | "peak-demand"
  | "equipment-failure"
  | "energy"
  | "emergency"
  | "maintenance";

export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  durationMinutes: number;
  passengerMultiplier: number;
  ambientTemperatureC: number;
  affectedEquipmentIds: string[];
  injectedFaultCode: string | null;
  severity: AlarmLevel;
  targetOperatingMode: OperatingMode;
  status: ScenarioStatus;
}

export interface ScenarioExecutionResult {
  executionId: string;
  scenarioId: string;
  scenarioName: string;
  startedAt: string;
  completedAt: string;
  summary: string;
  previousState: PlantState;
  resultingState: PlantState;
}

export interface DailyOperationalReport {
  reportId: string;
  reportDate: string;
  generatedAt: string;
  operatingMode: OperatingMode;
  totalFlights: number;
  expectedPassengers: number;
  runningChillers: number;
  activeAhus: number;
  totalPlantPowerKw: number;
  totalEnergyKwh: number;
  activeAlarmCount: number;
  warningCount: number;
  criticalCount: number;
  averageChillerCop: number;
  plantAvailabilityPercent: number;
  estimatedEnergySavingKwh: number;
  estimatedCarbonKg: number;
  executiveSummary: string;
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  actor: string;
  source: "dashboard" | "lumi" | "simulation" | "api" | "system";
  action: string;
  module: string;
  recordId: string | null;
  oldValue: unknown;
  newValue: unknown;
  result: "success" | "failed" | "rejected";
  details: string;
}
