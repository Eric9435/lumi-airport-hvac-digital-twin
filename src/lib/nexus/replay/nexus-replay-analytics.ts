import {
  getNexusReplaySnapshot,
  loadNexusReplayBundle,
  type NexusReplayDatasetSnapshot,
  type NexusReplayRow,
  type NexusReplaySnapshot,
} from "@/lib/nexus/replay/nexus-replay-engine";

const STATUS_FIELD_CANDIDATES = [
  "status",
  "state",
  "operating_status",
  "equipment_status",
  "device_status",
  "system_status",
  "flight_status",
  "baggage_status",
  "health_status",
  "alarm_state",
] as const;

const ALERT_FIELD_CANDIDATES = [
  "severity",
  "alarm_severity",
  "alert_level",
  "alarm_state",
  "alarm_status",
  "fault_status",
  "condition",
  "status",
  "state",
] as const;

const ALERT_VALUES = new Set([
  "alarm",
  "alert",
  "critical",
  "danger",
  "emergency",
  "error",
  "failed",
  "failure",
  "fault",
  "high",
  "major",
  "offline",
  "overload",
  "trip",
  "tripped",
  "unhealthy",
  "warning",
]);

const NON_METRIC_FIELDS = new Set([
  "timestamp",
  "asset_id",
  "equipment_id",
  "device_id",
  "flight_id",
  "zone_id",
  "dataset_id",
  "terminal_id",
  "gate_id",
  "belt_id",
  "building_id",
  "system_id",
  "platform_id",
  "edge_id",
  "year",
  "month",
  "day",
]);

export interface NexusNumericMetricSummary {
  field: string;
  sampleCount: number;
  minimum: number;
  maximum: number;
  average: number;
}

export interface NexusReplayDatasetAnalytics {
  datasetId: string;
  filename: string;
  rowCount: number;
  statusField: string | null;
  statusDistribution: Record<string, number>;
  alertCount: number;
  alertPercent: number;
  numericMetricCount: number;
  numericMetrics: NexusNumericMetricSummary[];
}

export interface NexusReplayAnalytics {
  platform: "LUMI Nexus";
  runtimeMode: "dataset-replay";
  dataOrigin: "simulated";
  physicalControlEnabled: false;
  index: number;
  timestamp: string;
  progressPercent: number;
  datasetCount: number;
  totalRows: number;
  totalAlerts: number;
  alertPercent: number;
  datasetsWithAlerts: number;
  numericMetricCount: number;
  datasets: NexusReplayDatasetAnalytics[];
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function findFirstPopulatedField(
  rows: NexusReplayRow[],
  candidates: readonly string[],
): string | null {
  for (const candidate of candidates) {
    if (
      rows.some(
        (row) =>
          typeof row[candidate] === "string" &&
          row[candidate].trim().length > 0,
      )
    ) {
      return candidate;
    }
  }

  return null;
}

function buildStatusDistribution(
  rows: NexusReplayRow[],
  statusField: string | null,
): Record<string, number> {
  if (!statusField) {
    return {};
  }

  const distribution: Record<string, number> = {};

  for (const row of rows) {
    const rawValue = row[statusField]?.trim();

    if (!rawValue) {
      continue;
    }

    const normalized = normalizeValue(rawValue);

    distribution[normalized] = (distribution[normalized] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(distribution).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

function rowContainsAlert(row: NexusReplayRow): boolean {
  for (const field of ALERT_FIELD_CANDIDATES) {
    const rawValue = row[field];

    if (!rawValue) {
      continue;
    }

    const normalized = normalizeValue(rawValue);

    if (ALERT_VALUES.has(normalized)) {
      return true;
    }

    for (const alertValue of ALERT_VALUES) {
      if (normalized.includes(alertValue)) {
        return true;
      }
    }
  }

  const booleanAlarmFields = [
    "alarm_active",
    "fault_active",
    "alert_active",
    "emergency_active",
    "trip_active",
  ];

  return booleanAlarmFields.some((field) => {
    const normalized = normalizeValue(row[field] ?? "");

    return (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "active"
    );
  });
}

function parseFiniteNumber(value: string): number | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildNumericMetrics(
  rows: NexusReplayRow[],
): NexusNumericMetricSummary[] {
  const samples = new Map<string, number[]>();

  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      if (
        NON_METRIC_FIELDS.has(field) ||
        field.endsWith("_id") ||
        field.includes("timestamp")
      ) {
        continue;
      }

      const numericValue = parseFiniteNumber(value);

      if (numericValue === null) {
        continue;
      }

      const existing = samples.get(field) ?? [];

      existing.push(numericValue);
      samples.set(field, existing);
    }
  }

  return [...samples.entries()]
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) => {
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const total = values.reduce((sum, value) => sum + value, 0);

      return {
        field,
        sampleCount: values.length,
        minimum: round(minimum),
        maximum: round(maximum),
        average: round(total / values.length),
      };
    })
    .sort((left, right) => left.field.localeCompare(right.field));
}

export function analyzeNexusReplayDataset(
  dataset: NexusReplayDatasetSnapshot,
): NexusReplayDatasetAnalytics {
  const statusField = findFirstPopulatedField(
    dataset.rows,
    STATUS_FIELD_CANDIDATES,
  );

  const statusDistribution = buildStatusDistribution(dataset.rows, statusField);

  const alertCount = dataset.rows.filter(rowContainsAlert).length;

  const numericMetrics = buildNumericMetrics(dataset.rows);

  return {
    datasetId: dataset.datasetId,
    filename: dataset.filename,
    rowCount: dataset.rowCount,
    statusField,
    statusDistribution,
    alertCount,
    alertPercent:
      dataset.rowCount > 0 ? round((alertCount / dataset.rowCount) * 100) : 0,
    numericMetricCount: numericMetrics.length,
    numericMetrics,
  };
}

export function analyzeNexusReplaySnapshot(
  snapshot: NexusReplaySnapshot,
): NexusReplayAnalytics {
  const datasets = snapshot.datasets.map(analyzeNexusReplayDataset);

  const totalAlerts = datasets.reduce(
    (total, dataset) => total + dataset.alertCount,
    0,
  );

  const numericMetricCount = datasets.reduce(
    (total, dataset) => total + dataset.numericMetricCount,
    0,
  );

  return {
    platform: "LUMI Nexus",
    runtimeMode: "dataset-replay",
    dataOrigin: "simulated",
    physicalControlEnabled: false,
    index: snapshot.index,
    timestamp: snapshot.timestamp,
    progressPercent: snapshot.progressPercent,
    datasetCount: snapshot.datasetCount,
    totalRows: snapshot.totalRows,
    totalAlerts,
    alertPercent:
      snapshot.totalRows > 0
        ? round((totalAlerts / snapshot.totalRows) * 100)
        : 0,
    datasetsWithAlerts: datasets.filter((dataset) => dataset.alertCount > 0)
      .length,
    numericMetricCount,
    datasets,
  };
}

export function loadNexusReplayAnalytics(
  index: number,
  repositoryRoot = process.cwd(),
): NexusReplayAnalytics {
  const bundle = loadNexusReplayBundle(repositoryRoot);

  const snapshot = getNexusReplaySnapshot(bundle, index);

  return analyzeNexusReplaySnapshot(snapshot);
}
