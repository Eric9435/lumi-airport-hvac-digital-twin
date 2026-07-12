export const AHU_IDS = [
  "AHU-01",
  "AHU-02",
  "AHU-03",
  "AHU-04",
  "AHU-05",
  "AHU-06",
] as const;

export type AhuId = (typeof AHU_IDS)[number];

export const SENSOR_CSV_COLUMNS = [
  "timestamp",
  "passenger_count",
  "staff_count",
  "active_flights",
  "active_gates",
  "outdoor_dry_bulb_c",
  "outdoor_wet_bulb_c",
  "outdoor_rh_percent",
  "solar_load_percent",
  "lighting_load_kw",
  "equipment_load_kw",
  "ventilation_load_kw",
  "ahu_cooling_demand_percent",
  "chw_supply_temp_c",
  "chw_return_temp_c",
  "calculated_cooling_load_kw",

  "ahu_01_zone_temp_c",
  "ahu_01_setpoint_c",
  "ahu_01_cooling_valve_percent",

  "ahu_02_zone_temp_c",
  "ahu_02_setpoint_c",
  "ahu_02_cooling_valve_percent",

  "ahu_03_zone_temp_c",
  "ahu_03_setpoint_c",
  "ahu_03_cooling_valve_percent",

  "ahu_04_zone_temp_c",
  "ahu_04_setpoint_c",
  "ahu_04_cooling_valve_percent",

  "ahu_05_zone_temp_c",
  "ahu_05_setpoint_c",
  "ahu_05_cooling_valve_percent",

  "ahu_06_zone_temp_c",
  "ahu_06_setpoint_c",
  "ahu_06_cooling_valve_percent",

  "sensor_quality",
] as const;

export type SensorCsvColumn = (typeof SENSOR_CSV_COLUMNS)[number];

export type SensorQuality = "GOOD" | "UNCERTAIN" | "BAD" | "MISSING";

export interface AhuSensorSnapshot {
  id: AhuId;
  zoneTemperatureC: number;
  setpointC: number;
  coolingValvePercent: number;
  temperatureErrorC: number;
  coolingDemandPercent: number;
}

export interface SensorCsvRow {
  timestamp: string;

  passengerCount: number;
  staffCount: number;
  activeFlights: number;
  activeGates: number;

  outdoorDryBulbC: number;
  outdoorWetBulbC: number;
  outdoorRhPercent: number;
  solarLoadPercent: number;

  lightingLoadKw: number;
  equipmentLoadKw: number;
  ventilationLoadKw: number;

  ahuCoolingDemandPercent: number;

  chwSupplyTempC: number;
  chwReturnTempC: number;

  calculatedCoolingLoadKw: number;

  ahus: AhuSensorSnapshot[];

  averageZoneTemperatureC: number;
  averageZoneSetpointC: number;
  averageZoneTemperatureErrorC: number;
  averageCoolingValvePercent: number;

  effectiveCoolingLoadKw: number;

  sensorQuality: SensorQuality;
}

export interface SensorCsvValidationIssue {
  rowNumber: number;
  column: string;
  message: string;
  severity: "error" | "warning";
}

export interface SensorCsvParseResult {
  rows: SensorCsvRow[];
  issues: SensorCsvValidationIssue[];
  sourceRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
}
