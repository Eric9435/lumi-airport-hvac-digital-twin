import {
  SENSOR_CSV_COLUMNS,
  type SensorCsvParseResult,
  type SensorCsvRow,
  type SensorCsvValidationIssue,
  type SensorQuality,
} from "@/types/sensor-csv";

function parseNumber(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return Number.NaN;
  }

  return Number(raw.trim());
}

function isFiniteInRange(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function validateQuality(value: string): value is SensorQuality {
  return ["GOOD", "UNCERTAIN", "BAD", "MISSING"].includes(value);
}

export function parseSensorCsv(csvText: string): SensorCsvParseResult {
  const normalized = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          column: "file",
          message: "CSV file is empty.",
          severity: "error",
        },
      ],
      sourceRowCount: 0,
      validRowCount: 0,
      invalidRowCount: 0,
    };
  }

  const lines = normalized.split("\n").filter((line) => line.trim() !== "");

  const header = splitCsvLine(lines[0]);

  const issues: SensorCsvValidationIssue[] = [];

  for (const requiredColumn of SENSOR_CSV_COLUMNS) {
    if (!header.includes(requiredColumn)) {
      issues.push({
        rowNumber: 1,
        column: requiredColumn,
        message: `Required column "${requiredColumn}" is missing.`,
        severity: "error",
      });
    }
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return {
      rows: [],
      issues,
      sourceRowCount: Math.max(0, lines.length - 1),
      validRowCount: 0,
      invalidRowCount: Math.max(0, lines.length - 1),
    };
  }

  const columnIndex = new Map(header.map((column, index) => [column, index]));

  const rows: SensorCsvRow[] = [];
  let invalidRowCount = 0;
  let previousTimestamp = Number.NEGATIVE_INFINITY;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const sourceRowNumber = lineIndex + 1;
    const values = splitCsvLine(lines[lineIndex]);

    const read = (column: string): string =>
      values[columnIndex.get(column) ?? -1] ?? "";

    const timestamp = read("timestamp");
    const timestampMs = Date.parse(timestamp);

    const passengerCount = parseNumber(read("passenger_count"));
    const staffCount = parseNumber(read("staff_count"));
    const activeFlights = parseNumber(read("active_flights"));
    const activeGates = parseNumber(read("active_gates"));
    const outdoorDryBulbC = parseNumber(read("outdoor_dry_bulb_c"));
    const outdoorWetBulbC = parseNumber(read("outdoor_wet_bulb_c"));
    const outdoorRhPercent = parseNumber(read("outdoor_rh_percent"));
    const solarLoadPercent = parseNumber(read("solar_load_percent"));
    const lightingLoadKw = parseNumber(read("lighting_load_kw"));
    const equipmentLoadKw = parseNumber(read("equipment_load_kw"));
    const ventilationLoadKw = parseNumber(read("ventilation_load_kw"));
    const ahuCoolingDemandPercent = parseNumber(
      read("ahu_cooling_demand_percent"),
    );
    const chwSupplyTempC = parseNumber(read("chw_supply_temp_c"));
    const chwReturnTempC = parseNumber(read("chw_return_temp_c"));
    const calculatedCoolingLoadKw = parseNumber(
      read("calculated_cooling_load_kw"),
    );
    const qualityRaw = read("sensor_quality").toUpperCase();

    const rowIssues: SensorCsvValidationIssue[] = [];

    const addError = (column: string, message: string): void => {
      rowIssues.push({
        rowNumber: sourceRowNumber,
        column,
        message,
        severity: "error",
      });
    };

    const addWarning = (column: string, message: string): void => {
      rowIssues.push({
        rowNumber: sourceRowNumber,
        column,
        message,
        severity: "warning",
      });
    };

    if (!Number.isFinite(timestampMs)) {
      addError("timestamp", "Invalid ISO-8601 timestamp.");
    } else if (timestampMs <= previousTimestamp) {
      addError("timestamp", "Timestamps must be strictly increasing.");
    }

    if (!isFiniteInRange(passengerCount, 0, 100000)) {
      addError(
        "passenger_count",
        "Passenger count must be between 0 and 100,000.",
      );
    }

    if (!isFiniteInRange(staffCount, 0, 20000)) {
      addError("staff_count", "Staff count must be between 0 and 20,000.");
    }

    if (!isFiniteInRange(activeFlights, 0, 500)) {
      addError("active_flights", "Active flights must be between 0 and 500.");
    }

    if (!isFiniteInRange(activeGates, 0, 200)) {
      addError("active_gates", "Active gates must be between 0 and 200.");
    }

    if (!isFiniteInRange(outdoorDryBulbC, -20, 60)) {
      addError(
        "outdoor_dry_bulb_c",
        "Dry-bulb temperature is outside the valid range.",
      );
    }

    if (!isFiniteInRange(outdoorWetBulbC, -20, 50)) {
      addError(
        "outdoor_wet_bulb_c",
        "Wet-bulb temperature is outside the valid range.",
      );
    }

    if (
      Number.isFinite(outdoorWetBulbC) &&
      Number.isFinite(outdoorDryBulbC) &&
      outdoorWetBulbC > outdoorDryBulbC
    ) {
      addError(
        "outdoor_wet_bulb_c",
        "Wet-bulb temperature cannot exceed dry-bulb temperature.",
      );
    }

    if (!isFiniteInRange(outdoorRhPercent, 0, 100)) {
      addError(
        "outdoor_rh_percent",
        "Relative humidity must be between 0 and 100%.",
      );
    }

    if (!isFiniteInRange(solarLoadPercent, 0, 100)) {
      addError("solar_load_percent", "Solar load must be between 0 and 100%.");
    }

    for (const [column, value] of [
      ["lighting_load_kw", lightingLoadKw],
      ["equipment_load_kw", equipmentLoadKw],
      ["ventilation_load_kw", ventilationLoadKw],
      ["calculated_cooling_load_kw", calculatedCoolingLoadKw],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) {
        addError(column, `${column} must be a non-negative number.`);
      }
    }

    if (!isFiniteInRange(ahuCoolingDemandPercent, 0, 100)) {
      addError(
        "ahu_cooling_demand_percent",
        "AHU cooling demand must be between 0 and 100%.",
      );
    }

    if (!isFiniteInRange(chwSupplyTempC, 1, 20)) {
      addError(
        "chw_supply_temp_c",
        "CHW supply temperature must be between 1°C and 20°C.",
      );
    }

    if (!isFiniteInRange(chwReturnTempC, 1, 30)) {
      addError(
        "chw_return_temp_c",
        "CHW return temperature must be between 1°C and 30°C.",
      );
    }

    if (
      Number.isFinite(chwSupplyTempC) &&
      Number.isFinite(chwReturnTempC) &&
      chwReturnTempC < chwSupplyTempC
    ) {
      addWarning(
        "chw_return_temp_c",
        "CHW return temperature is below supply temperature.",
      );
    }

    if (!validateQuality(qualityRaw)) {
      addError(
        "sensor_quality",
        "Quality must be GOOD, UNCERTAIN, BAD or MISSING.",
      );
    } else if (qualityRaw !== "GOOD") {
      addWarning("sensor_quality", `Sensor quality is ${qualityRaw}.`);
    }

    issues.push(...rowIssues);

    if (rowIssues.some((issue) => issue.severity === "error")) {
      invalidRowCount += 1;
      continue;
    }

    previousTimestamp = timestampMs;

    rows.push({
      timestamp,
      passengerCount,
      staffCount,
      activeFlights,
      activeGates,
      outdoorDryBulbC,
      outdoorWetBulbC,
      outdoorRhPercent,
      solarLoadPercent,
      lightingLoadKw,
      equipmentLoadKw,
      ventilationLoadKw,
      ahuCoolingDemandPercent,
      chwSupplyTempC,
      chwReturnTempC,
      calculatedCoolingLoadKw,
      sensorQuality: qualityRaw as SensorQuality,
    });
  }

  return {
    rows,
    issues,
    sourceRowCount: Math.max(0, lines.length - 1),
    validRowCount: rows.length,
    invalidRowCount,
  };
}

export function calculateRequiredChillerCount(
  coolingLoadKw: number,
  ratedCapacityKw = 52,
  usableCapacityPercent = 85,
): number {
  if (!Number.isFinite(coolingLoadKw) || coolingLoadKw <= 0) {
    return 0;
  }

  const usableCapacityKw = ratedCapacityKw * (usableCapacityPercent / 100);

  return Math.min(4, Math.max(1, Math.ceil(coolingLoadKw / usableCapacityKw)));
}
