import {
  AHU_IDS,
  SENSOR_CSV_COLUMNS,
  type AhuId,
  type AhuSensorSnapshot,
  type SensorCsvParseResult,
  type SensorCsvRow,
  type SensorCsvValidationIssue,
  type SensorQuality,
} from "@/types/sensor-csv";

const CHILLER_COUNT = 4;
const CHILLER_RATED_COOLING_CAPACITY_KW = 52;
const CHILLER_USABLE_CAPACITY_PERCENT = 85;

/**
 * Zone-temperature and cooling-valve demand are supervisory
 * correction signals. The uploaded calculated cooling load remains
 * the primary source value.
 */
const ZONE_ERROR_LOAD_FACTOR_PER_C = 0.08;
const VALVE_DEMAND_LOAD_FACTOR = 0.12;

function parseNumber(rawValue: string | undefined): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return Number.NaN;
  }

  return Number(rawValue.trim());
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

  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
}

function validateQuality(value: string): value is SensorQuality {
  return ["GOOD", "UNCERTAIN", "BAD", "MISSING"].includes(value);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, decimals = 3): number {
  const multiplier = 10 ** decimals;

  return Math.round(value * multiplier) / multiplier;
}

function getAhuColumnPrefix(ahuIndex: number): string {
  return `ahu_${String(ahuIndex + 1).padStart(2, "0")}`;
}

export function calculateEffectiveCoolingLoadKw(
  baseCoolingLoadKw: number,
  averageZoneTemperatureErrorC: number,
  averageCoolingValvePercent: number,
): number {
  if (!Number.isFinite(baseCoolingLoadKw) || baseCoolingLoadKw <= 0) {
    return 0;
  }

  const positiveTemperatureErrorC = Math.max(0, averageZoneTemperatureErrorC);

  const zoneCorrectionFactor =
    positiveTemperatureErrorC * ZONE_ERROR_LOAD_FACTOR_PER_C;

  const valveCorrectionFactor =
    (Math.max(0, averageCoolingValvePercent - 50) / 50) *
    VALVE_DEMAND_LOAD_FACTOR;

  const correctionFactor = Math.min(
    0.35,
    zoneCorrectionFactor + valveCorrectionFactor,
  );

  return round(baseCoolingLoadKw * (1 + correctionFactor), 3);
}

export function calculateRequiredChillerCount(
  coolingLoadKw: number,
  ratedCapacityKw = CHILLER_RATED_COOLING_CAPACITY_KW,
  usableCapacityPercent = CHILLER_USABLE_CAPACITY_PERCENT,
): number {
  if (!Number.isFinite(coolingLoadKw) || coolingLoadKw <= 0) {
    return 0;
  }

  const usableCapacityKw = ratedCapacityKw * (usableCapacityPercent / 100);

  return Math.min(
    CHILLER_COUNT,
    Math.max(1, Math.ceil(coolingLoadKw / usableCapacityKw)),
  );
}

export function parseSensorCsv(csvText: string): SensorCsvParseResult {
  const normalizedCsv = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalizedCsv) {
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

  const lines = normalizedCsv.split("\n").filter((line) => line.trim() !== "");

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
    const sourceRowCount = Math.max(0, lines.length - 1);

    return {
      rows: [],
      issues,
      sourceRowCount,
      validRowCount: 0,
      invalidRowCount: sourceRowCount,
    };
  }

  const columnIndex = new Map(header.map((column, index) => [column, index]));

  const rows: SensorCsvRow[] = [];

  let invalidRowCount = 0;
  let previousTimestamp = Number.NEGATIVE_INFINITY;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const values = splitCsvLine(lines[lineIndex]);

    const read = (column: string): string =>
      values[columnIndex.get(column) ?? -1] ?? "";

    const timestamp = read("timestamp");
    const timestampMilliseconds = Date.parse(timestamp);

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

    const sensorQualityRaw = read("sensor_quality").toUpperCase();

    const rowIssues: SensorCsvValidationIssue[] = [];

    const addError = (column: string, message: string): void => {
      rowIssues.push({
        rowNumber,
        column,
        message,
        severity: "error",
      });
    };

    const addWarning = (column: string, message: string): void => {
      rowIssues.push({
        rowNumber,
        column,
        message,
        severity: "warning",
      });
    };

    if (!Number.isFinite(timestampMilliseconds)) {
      addError("timestamp", "Invalid ISO-8601 timestamp.");
    } else if (timestampMilliseconds <= previousTimestamp) {
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

    const ahuSnapshots: AhuSensorSnapshot[] = AHU_IDS.map(
      (ahuId: AhuId, ahuIndex) => {
        const prefix = getAhuColumnPrefix(ahuIndex);

        const zoneTemperatureC = parseNumber(read(`${prefix}_zone_temp_c`));

        const setpointC = parseNumber(read(`${prefix}_setpoint_c`));

        const coolingValvePercent = parseNumber(
          read(`${prefix}_cooling_valve_percent`),
        );

        if (!isFiniteInRange(zoneTemperatureC, 10, 45)) {
          addError(
            `${prefix}_zone_temp_c`,
            `${ahuId} zone temperature must be between 10°C and 45°C.`,
          );
        }

        if (!isFiniteInRange(setpointC, 16, 30)) {
          addError(
            `${prefix}_setpoint_c`,
            `${ahuId} setpoint must be between 16°C and 30°C.`,
          );
        }

        if (!isFiniteInRange(coolingValvePercent, 0, 100)) {
          addError(
            `${prefix}_cooling_valve_percent`,
            `${ahuId} cooling valve must be between 0 and 100%.`,
          );
        }

        const temperatureErrorC = zoneTemperatureC - setpointC;

        const temperatureDemand = Math.max(0, temperatureErrorC) * 25;

        const coolingDemandPercent = Math.min(
          100,
          Math.max(coolingValvePercent, temperatureDemand),
        );

        return {
          id: ahuId,
          zoneTemperatureC,
          setpointC,
          coolingValvePercent,
          temperatureErrorC: round(temperatureErrorC, 2),
          coolingDemandPercent: round(coolingDemandPercent, 1),
        };
      },
    );

    const averageZoneTemperatureC = average(
      ahuSnapshots.map((ahu) => ahu.zoneTemperatureC),
    );

    const averageZoneSetpointC = average(
      ahuSnapshots.map((ahu) => ahu.setpointC),
    );

    const averageZoneTemperatureErrorC =
      averageZoneTemperatureC - averageZoneSetpointC;

    const averageCoolingValvePercent = average(
      ahuSnapshots.map((ahu) => ahu.coolingValvePercent),
    );

    if (averageZoneTemperatureErrorC > 3) {
      addWarning(
        "ahu_zone_temperature",
        `Average indoor temperature is ${averageZoneTemperatureErrorC.toFixed(
          1,
        )}°C above setpoint.`,
      );
    }

    if (averageCoolingValvePercent >= 90) {
      addWarning(
        "ahu_cooling_valve_percent",
        "Average AHU cooling-valve demand is at or above 90%.",
      );
    }

    if (!validateQuality(sensorQualityRaw)) {
      addError(
        "sensor_quality",
        "Quality must be GOOD, UNCERTAIN, BAD or MISSING.",
      );
    } else if (sensorQualityRaw !== "GOOD") {
      addWarning("sensor_quality", `Sensor quality is ${sensorQualityRaw}.`);
    }

    issues.push(...rowIssues);

    if (rowIssues.some((issue) => issue.severity === "error")) {
      invalidRowCount += 1;
      continue;
    }

    previousTimestamp = timestampMilliseconds;

    const effectiveCoolingLoadKw = calculateEffectiveCoolingLoadKw(
      calculatedCoolingLoadKw,
      averageZoneTemperatureErrorC,
      averageCoolingValvePercent,
    );

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

      ahus: ahuSnapshots,

      averageZoneTemperatureC: round(averageZoneTemperatureC, 2),

      averageZoneSetpointC: round(averageZoneSetpointC, 2),

      averageZoneTemperatureErrorC: round(averageZoneTemperatureErrorC, 2),

      averageCoolingValvePercent: round(averageCoolingValvePercent, 1),

      effectiveCoolingLoadKw,

      sensorQuality: sensorQualityRaw as SensorQuality,
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
