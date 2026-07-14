import {
  isValidTimestamp,
  parseCsvText,
  requiredColumnsMissing,
  toFiniteNumber,
} from "@/lib/industrial-data/csv-utils";

import type {
  AhuEnvironmentCsvRow,
  AlarmEventCsvRow,
  EquipmentConditionCsvRow,
  IndustrialCommunicationStatus,
  IndustrialCsvIssue,
  IndustrialCsvParseResult,
  IndustrialSensorQuality,
} from "@/types/industrial-csv";

const QUALITY_VALUES = new Set<IndustrialSensorQuality>([
  "GOOD",
  "UNCERTAIN",
  "BAD",
  "MISSING",
  "STALE",
]);

const COMMUNICATION_VALUES = new Set<IndustrialCommunicationStatus>([
  "online",
  "degraded",
  "intermittent",
  "offline",
  "unknown",
]);

function emptyResult<T>(
  issues: IndustrialCsvIssue[],
): IndustrialCsvParseResult<T> {
  return {
    rows: [],
    issues,
    sourceRowCount: 0,
    validRowCount: 0,
    invalidRowCount: 0,
  };
}

function numberValue(
  row: Record<string, string>,
  column: string,
  rowNumber: number,
  dataset: IndustrialCsvIssue["dataset"],
  issues: IndustrialCsvIssue[],
): number | null {
  const value = toFiniteNumber(row[column] ?? "");

  if (value === null) {
    issues.push({
      dataset,
      rowNumber,
      column,
      severity: "error",
      message: "A finite numeric value is required.",
    });
  }

  return value;
}

export function parseAhuEnvironmentCsv(
  text: string,
): IndustrialCsvParseResult<AhuEnvironmentCsvRow> {
  const rawRows = parseCsvText(text);
  const issues: IndustrialCsvIssue[] = [];

  const required = [
    "timestamp",
    "equipment_id",
    "zone_name",
    "status",
    "zone_temp_c",
    "zone_setpoint_c",
    "zone_rh_percent",
    "supply_air_temp_c",
    "return_air_temp_c",
    "supply_air_rh_percent",
    "return_air_rh_percent",
    "supply_airflow_cmh",
    "fan_speed_percent",
    "cooling_valve_percent",
    "damper_position_percent",
    "outdoor_air_percent",
    "filter_dp_pa",
    "co2_ppm",
    "pm25_ug_m3",
    "occupancy",
    "sensor_quality",
    "communication_status",
    "data_age_seconds",
  ];

  const missing = requiredColumnsMissing(rawRows, required);

  if (missing.length > 0) {
    return emptyResult(
      missing.map((column) => ({
        dataset: "ahu-environment",
        rowNumber: 1,
        column,
        severity: "error",
        message: "Required CSV column is missing.",
      })),
    );
  }

  const rows: AhuEnvironmentCsvRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const initialErrorCount = issues.filter(
      (issue) => issue.severity === "error",
    ).length;

    if (!isValidTimestamp(raw.timestamp ?? "")) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "timestamp",
        severity: "error",
        message: "Invalid timestamp.",
      });
    }

    const quality = raw.sensor_quality as IndustrialSensorQuality;

    const communicationStatus =
      raw.communication_status as IndustrialCommunicationStatus;

    if (!QUALITY_VALUES.has(quality)) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "sensor_quality",
        severity: "error",
        message: "Unsupported sensor quality value.",
      });
    }

    if (!COMMUNICATION_VALUES.has(communicationStatus)) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "communication_status",
        severity: "error",
        message: "Unsupported communication status.",
      });
    }

    const numeric = {
      zoneTemperatureC: numberValue(
        raw,
        "zone_temp_c",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      zoneSetpointC: numberValue(
        raw,
        "zone_setpoint_c",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      zoneRelativeHumidityPercent: numberValue(
        raw,
        "zone_rh_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      supplyAirTemperatureC: numberValue(
        raw,
        "supply_air_temp_c",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      returnAirTemperatureC: numberValue(
        raw,
        "return_air_temp_c",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      supplyAirRelativeHumidityPercent: numberValue(
        raw,
        "supply_air_rh_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      returnAirRelativeHumidityPercent: numberValue(
        raw,
        "return_air_rh_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      supplyAirflowCmh: numberValue(
        raw,
        "supply_airflow_cmh",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      fanSpeedPercent: numberValue(
        raw,
        "fan_speed_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      coolingValvePercent: numberValue(
        raw,
        "cooling_valve_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      damperPositionPercent: numberValue(
        raw,
        "damper_position_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      outdoorAirPercent: numberValue(
        raw,
        "outdoor_air_percent",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      filterDifferentialPressurePa: numberValue(
        raw,
        "filter_dp_pa",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      co2Ppm: numberValue(raw, "co2_ppm", rowNumber, "ahu-environment", issues),
      pm25MicrogramsPerM3: numberValue(
        raw,
        "pm25_ug_m3",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      occupancy: numberValue(
        raw,
        "occupancy",
        rowNumber,
        "ahu-environment",
        issues,
      ),
      dataAgeSeconds: numberValue(
        raw,
        "data_age_seconds",
        rowNumber,
        "ahu-environment",
        issues,
      ),
    };

    const currentErrorCount = issues.filter(
      (issue) => issue.severity === "error",
    ).length;

    if (
      currentErrorCount > initialErrorCount ||
      Object.values(numeric).some((value) => value === null)
    ) {
      return;
    }

    if ((numeric.co2Ppm ?? 0) >= 1000) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "co2_ppm",
        severity: "warning",
        message: "Zone CO₂ is at or above the configured warning threshold.",
      });
    }

    if ((numeric.pm25MicrogramsPerM3 ?? 0) >= 25) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "pm25_ug_m3",
        severity: "warning",
        message: "Zone PM2.5 is at or above the configured warning threshold.",
      });
    }

    if ((numeric.filterDifferentialPressurePa ?? 0) >= 200) {
      issues.push({
        dataset: "ahu-environment",
        rowNumber,
        column: "filter_dp_pa",
        severity: "warning",
        message: "AHU filter differential pressure is high.",
      });
    }

    rows.push({
      timestamp: raw.timestamp ?? "",
      equipmentId: raw.equipment_id ?? "",
      zoneName: raw.zone_name ?? "",
      status: raw.status ?? "",
      zoneTemperatureC: numeric.zoneTemperatureC!,
      zoneSetpointC: numeric.zoneSetpointC!,
      zoneRelativeHumidityPercent: numeric.zoneRelativeHumidityPercent!,
      supplyAirTemperatureC: numeric.supplyAirTemperatureC!,
      returnAirTemperatureC: numeric.returnAirTemperatureC!,
      supplyAirRelativeHumidityPercent:
        numeric.supplyAirRelativeHumidityPercent!,
      returnAirRelativeHumidityPercent:
        numeric.returnAirRelativeHumidityPercent!,
      supplyAirflowCmh: numeric.supplyAirflowCmh!,
      fanSpeedPercent: numeric.fanSpeedPercent!,
      coolingValvePercent: numeric.coolingValvePercent!,
      damperPositionPercent: numeric.damperPositionPercent!,
      outdoorAirPercent: numeric.outdoorAirPercent!,
      filterDifferentialPressurePa: numeric.filterDifferentialPressurePa!,
      co2Ppm: numeric.co2Ppm!,
      pm25MicrogramsPerM3: numeric.pm25MicrogramsPerM3!,
      occupancy: numeric.occupancy!,
      sensorQuality: quality,
      communicationStatus,
      dataAgeSeconds: numeric.dataAgeSeconds!,
    });
  });

  const errorRows = new Set(
    issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.rowNumber),
  );

  return {
    rows,
    issues,
    sourceRowCount: rawRows.length,
    validRowCount: rows.length,
    invalidRowCount: errorRows.size,
  };
}

export function parseEquipmentConditionCsv(
  text: string,
): IndustrialCsvParseResult<EquipmentConditionCsvRow> {
  const rawRows = parseCsvText(text);
  const issues: IndustrialCsvIssue[] = [];

  const required = [
    "timestamp",
    "equipment_id",
    "equipment_type",
    "status",
    "load_percent",
    "power_kw",
    "motor_current_a",
    "vibration_rms_mm_s",
    "bearing_temp_c",
    "motor_winding_temp_c",
    "current_imbalance_percent",
    "runtime_hours",
    "start_count",
    "health_score",
    "failure_probability_percent",
    "remaining_useful_life_days",
    "alarm_code",
    "sensor_quality",
    "communication_status",
    "data_age_seconds",
  ];

  const missing = requiredColumnsMissing(rawRows, required);

  if (missing.length > 0) {
    return emptyResult(
      missing.map((column) => ({
        dataset: "equipment-condition",
        rowNumber: 1,
        column,
        severity: "error",
        message: "Required CSV column is missing.",
      })),
    );
  }

  const rows: EquipmentConditionCsvRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const initialErrors = issues.filter(
      (issue) => issue.severity === "error",
    ).length;

    if (!isValidTimestamp(raw.timestamp ?? "")) {
      issues.push({
        dataset: "equipment-condition",
        rowNumber,
        column: "timestamp",
        severity: "error",
        message: "Invalid timestamp.",
      });
    }

    const quality = raw.sensor_quality as IndustrialSensorQuality;

    const communicationStatus =
      raw.communication_status as IndustrialCommunicationStatus;

    if (!QUALITY_VALUES.has(quality)) {
      issues.push({
        dataset: "equipment-condition",
        rowNumber,
        column: "sensor_quality",
        severity: "error",
        message: "Unsupported sensor quality value.",
      });
    }

    if (!COMMUNICATION_VALUES.has(communicationStatus)) {
      issues.push({
        dataset: "equipment-condition",
        rowNumber,
        column: "communication_status",
        severity: "error",
        message: "Unsupported communication status.",
      });
    }

    const numbers = {
      loadPercent: numberValue(
        raw,
        "load_percent",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      powerKw: numberValue(
        raw,
        "power_kw",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      motorCurrentA: numberValue(
        raw,
        "motor_current_a",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      vibrationRmsMmPerSecond: numberValue(
        raw,
        "vibration_rms_mm_s",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      bearingTemperatureC: numberValue(
        raw,
        "bearing_temp_c",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      motorWindingTemperatureC: numberValue(
        raw,
        "motor_winding_temp_c",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      currentImbalancePercent: numberValue(
        raw,
        "current_imbalance_percent",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      runtimeHours: numberValue(
        raw,
        "runtime_hours",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      startCount: numberValue(
        raw,
        "start_count",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      healthScore: numberValue(
        raw,
        "health_score",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      failureProbabilityPercent: numberValue(
        raw,
        "failure_probability_percent",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      remainingUsefulLifeDays: numberValue(
        raw,
        "remaining_useful_life_days",
        rowNumber,
        "equipment-condition",
        issues,
      ),
      dataAgeSeconds: numberValue(
        raw,
        "data_age_seconds",
        rowNumber,
        "equipment-condition",
        issues,
      ),
    };

    const currentErrors = issues.filter(
      (issue) => issue.severity === "error",
    ).length;

    if (
      currentErrors > initialErrors ||
      Object.values(numbers).some((value) => value === null)
    ) {
      return;
    }

    if ((numbers.vibrationRmsMmPerSecond ?? 0) >= 3.5) {
      issues.push({
        dataset: "equipment-condition",
        rowNumber,
        column: "vibration_rms_mm_s",
        severity: "warning",
        message: "Equipment vibration is above the warning threshold.",
      });
    }

    if ((numbers.bearingTemperatureC ?? 0) >= 65) {
      issues.push({
        dataset: "equipment-condition",
        rowNumber,
        column: "bearing_temp_c",
        severity: "warning",
        message: "Bearing temperature is above the warning threshold.",
      });
    }

    rows.push({
      timestamp: raw.timestamp ?? "",
      equipmentId: raw.equipment_id ?? "",
      equipmentType: raw.equipment_type ?? "",
      status: raw.status ?? "",
      loadPercent: numbers.loadPercent!,
      powerKw: numbers.powerKw!,
      motorCurrentA: numbers.motorCurrentA!,
      vibrationRmsMmPerSecond: numbers.vibrationRmsMmPerSecond!,
      bearingTemperatureC: numbers.bearingTemperatureC!,
      motorWindingTemperatureC: numbers.motorWindingTemperatureC!,
      currentImbalancePercent: numbers.currentImbalancePercent!,
      runtimeHours: numbers.runtimeHours!,
      startCount: numbers.startCount!,
      healthScore: numbers.healthScore!,
      failureProbabilityPercent: numbers.failureProbabilityPercent!,
      remainingUsefulLifeDays: numbers.remainingUsefulLifeDays!,
      alarmCode: raw.alarm_code?.trim() || null,
      sensorQuality: quality,
      communicationStatus,
      dataAgeSeconds: numbers.dataAgeSeconds!,
    });
  });

  const invalidRows = new Set(
    issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.rowNumber),
  );

  return {
    rows,
    issues,
    sourceRowCount: rawRows.length,
    validRowCount: rows.length,
    invalidRowCount: invalidRows.size,
  };
}

export function parseAlarmEventsCsv(
  text: string,
): IndustrialCsvParseResult<AlarmEventCsvRow> {
  const rawRows = parseCsvText(text);
  const issues: IndustrialCsvIssue[] = [];

  const required = [
    "event_id",
    "raised_at",
    "cleared_at",
    "equipment_id",
    "equipment_type",
    "alarm_code",
    "alarm_name",
    "severity",
    "status",
    "acknowledged",
    "acknowledged_by",
    "message",
    "recommended_action",
  ];

  const missing = requiredColumnsMissing(rawRows, required);

  if (missing.length > 0) {
    return emptyResult(
      missing.map((column) => ({
        dataset: "alarm-events",
        rowNumber: 1,
        column,
        severity: "error",
        message: "Required CSV column is missing.",
      })),
    );
  }

  const rows: AlarmEventCsvRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;

    if (!isValidTimestamp(raw.raised_at ?? "")) {
      issues.push({
        dataset: "alarm-events",
        rowNumber,
        column: "raised_at",
        severity: "error",
        message: "Invalid raised timestamp.",
      });

      return;
    }

    const clearedAt = raw.cleared_at?.trim() || null;

    if (clearedAt && !isValidTimestamp(clearedAt)) {
      issues.push({
        dataset: "alarm-events",
        rowNumber,
        column: "cleared_at",
        severity: "error",
        message: "Invalid cleared timestamp.",
      });

      return;
    }

    rows.push({
      eventId: raw.event_id ?? "",
      raisedAt: raw.raised_at ?? "",
      clearedAt,
      equipmentId: raw.equipment_id ?? "",
      equipmentType: raw.equipment_type ?? "",
      alarmCode: raw.alarm_code ?? "",
      alarmName: raw.alarm_name ?? "",
      severity: raw.severity ?? "",
      status: raw.status ?? "",
      acknowledged: (raw.acknowledged ?? "").toLowerCase() === "true",
      acknowledgedBy: raw.acknowledged_by?.trim() || null,
      message: raw.message ?? "",
      recommendedAction: raw.recommended_action ?? "",
    });
  });

  const invalidRows = new Set(
    issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.rowNumber),
  );

  return {
    rows,
    issues,
    sourceRowCount: rawRows.length,
    validRowCount: rows.length,
    invalidRowCount: invalidRows.size,
  };
}
