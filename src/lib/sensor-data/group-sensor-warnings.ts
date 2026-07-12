import type {
  SensorCsvRow,
  SensorCsvValidationIssue,
} from "@/types/sensor-csv";

export interface GroupedSensorWarning {
  key: string;
  label: string;
  field: string;
  startRowNumber: number;
  endRowNumber: number;
  startTimestamp: string | null;
  endTimestamp: string | null;
  occurrenceCount: number;
  message: string;
}

function warningKey(issue: SensorCsvValidationIssue): string {
  if (issue.column === "ahu_cooling_valve_percent") {
    return "high-ahu-valve";
  }

  if (issue.column === "ahu_zone_temperature") {
    return "high-zone-temperature";
  }

  if (issue.column === "sensor_quality") {
    return "sensor-quality";
  }

  return `${issue.column}:${issue.message}`;
}

function warningLabel(issue: SensorCsvValidationIssue): string {
  if (issue.column === "ahu_cooling_valve_percent") {
    return "High AHU Cooling-Valve Demand";
  }

  if (issue.column === "ahu_zone_temperature") {
    return "Indoor Temperature Above Setpoint";
  }

  if (issue.column === "sensor_quality") {
    return "Sensor Quality Warning";
  }

  return issue.column;
}

function timestampForIssue(
  issue: SensorCsvValidationIssue,
  rows: SensorCsvRow[],
): string | null {
  /*
   * CSV row 1 is the header.
   * CSV row 2 is rows[0].
   */
  const dataIndex = issue.rowNumber - 2;

  return rows[dataIndex]?.timestamp ?? null;
}

export function groupOperationalWarnings(
  issues: SensorCsvValidationIssue[],
  rows: SensorCsvRow[],
): GroupedSensorWarning[] {
  const warnings = issues
    .filter((issue) => issue.severity === "warning")
    .sort((left, right) => left.rowNumber - right.rowNumber);

  const groups: GroupedSensorWarning[] = [];

  for (const issue of warnings) {
    const key = warningKey(issue);
    const previous = groups.at(-1);

    const isConsecutive =
      previous?.key === key && issue.rowNumber <= previous.endRowNumber + 1;

    if (previous && isConsecutive) {
      previous.endRowNumber = issue.rowNumber;

      previous.endTimestamp = timestampForIssue(issue, rows);

      previous.occurrenceCount += 1;
      previous.message = issue.message;

      continue;
    }

    const timestamp = timestampForIssue(issue, rows);

    groups.push({
      key,
      label: warningLabel(issue),
      field: issue.column,
      startRowNumber: issue.rowNumber,
      endRowNumber: issue.rowNumber,
      startTimestamp: timestamp,
      endTimestamp: timestamp,
      occurrenceCount: 1,
      message: issue.message,
    });
  }

  return groups;
}
