export type IndustrialSensorQuality =
  "GOOD" | "UNCERTAIN" | "BAD" | "MISSING" | "STALE";

export type IndustrialCommunicationStatus =
  "online" | "degraded" | "intermittent" | "offline" | "unknown";

export interface IndustrialCsvIssue {
  dataset: "ahu-environment" | "equipment-condition" | "alarm-events";
  rowNumber: number;
  column: string;
  severity: "error" | "warning";
  message: string;
}

export interface AhuEnvironmentCsvRow {
  timestamp: string;
  equipmentId: string;
  zoneName: string;
  status: string;

  zoneTemperatureC: number;
  zoneSetpointC: number;
  zoneRelativeHumidityPercent: number;

  supplyAirTemperatureC: number;
  returnAirTemperatureC: number;
  supplyAirRelativeHumidityPercent: number;
  returnAirRelativeHumidityPercent: number;

  supplyAirflowCmh: number;
  fanSpeedPercent: number;
  coolingValvePercent: number;
  damperPositionPercent: number;
  outdoorAirPercent: number;

  filterDifferentialPressurePa: number;
  co2Ppm: number;
  pm25MicrogramsPerM3: number;
  occupancy: number;

  sensorQuality: IndustrialSensorQuality;
  communicationStatus: IndustrialCommunicationStatus;
  dataAgeSeconds: number;
}

export interface EquipmentConditionCsvRow {
  timestamp: string;
  equipmentId: string;
  equipmentType: string;
  status: string;

  loadPercent: number;
  powerKw: number;
  motorCurrentA: number;

  vibrationRmsMmPerSecond: number;
  bearingTemperatureC: number;
  motorWindingTemperatureC: number;
  currentImbalancePercent: number;

  runtimeHours: number;
  startCount: number;

  healthScore: number;
  failureProbabilityPercent: number;
  remainingUsefulLifeDays: number;

  alarmCode: string | null;
  sensorQuality: IndustrialSensorQuality;
  communicationStatus: IndustrialCommunicationStatus;
  dataAgeSeconds: number;
}

export interface AlarmEventCsvRow {
  eventId: string;
  raisedAt: string;
  clearedAt: string | null;
  equipmentId: string;
  equipmentType: string;
  alarmCode: string;
  alarmName: string;
  severity: string;
  status: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  message: string;
  recommendedAction: string;
}

export interface IndustrialCsvParseResult<T> {
  rows: T[];
  issues: IndustrialCsvIssue[];
  sourceRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
}

export interface IndustrialSnapshot {
  timestamp: string | null;
  ahus: AhuEnvironmentCsvRow[];
  equipment: EquipmentConditionCsvRow[];
  activeAlarms: AlarmEventCsvRow[];
}
