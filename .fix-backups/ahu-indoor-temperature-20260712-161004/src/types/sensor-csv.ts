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
  "sensor_quality",
] as const;

export type SensorCsvColumn = (typeof SENSOR_CSV_COLUMNS)[number];

export type SensorQuality = "GOOD" | "UNCERTAIN" | "BAD" | "MISSING";

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
