import fs from "node:fs";
import path from "node:path";

export const NEXUS_DATASET_DIRECTORY = "public/data/nexus-24h";

export const NEXUS_DATASET_MANIFEST = "dataset-manifest.csv";

export interface NexusDatasetManifestRecord {
  datasetId: string;
  filename: string;
  startTimestamp: string;
  endTimestamp: string;
  intervalMinutes: number;
  snapshotCount: number;
  expectedRowCount: number;
  columnCount: number;
  timezone: string;
  dataOrigin: string;
  platform: string;
  version: string;
}

export interface NexusDatasetValidationRecord extends NexusDatasetManifestRecord {
  exists: boolean;
  actualRowCount: number;
  rowCountValid: boolean;
  startTimestampPresent: boolean;
  endTimestampPresent: boolean;
  valid: boolean;
  absolutePath: string;
}

export interface NexusDatasetCatalog {
  status: "ready" | "invalid";
  platform: string;
  dataOrigin: string;
  physicalControlEnabled: false;
  directory: string;
  manifestFile: string;
  intervalMinutes: number | null;
  snapshotCount: number | null;
  datasetCount: number;
  validDatasetCount: number;
  totalRows: number;
  datasets: NexusDatasetValidationRecord[];
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function parsePositiveInteger(
  value: string,
  fieldName: string,
  filename: string,
): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `Invalid ${fieldName} value "${value}" in manifest record ${filename}.`,
    );
  }

  return parsed;
}

function countDataRows(content: string): number {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return 0;
  }

  return Math.max(0, trimmed.split(/\r?\n/).length - 1);
}

export function loadNexusDatasetManifest(
  repositoryRoot = process.cwd(),
): NexusDatasetManifestRecord[] {
  const manifestPath = path.resolve(
    repositoryRoot,
    NEXUS_DATASET_DIRECTORY,
    NEXUS_DATASET_MANIFEST,
  );

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Nexus dataset manifest does not exist: ${manifestPath}`);
  }

  const lines = fs
    .readFileSync(manifestPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      "Nexus dataset manifest does not contain any dataset records.",
    );
  }

  const headers = parseCsvLine(lines[0]);

  const requiredHeaders = [
    "dataset_id",
    "filename",
    "start_timestamp",
    "end_timestamp",
    "interval_minutes",
    "snapshot_count",
    "row_count",
    "column_count",
    "timezone",
    "data_origin",
    "platform",
    "version",
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(
        `Nexus dataset manifest is missing required column: ${requiredHeader}`,
      );
    }
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );

    const filename = record.filename;

    if (!filename) {
      throw new Error(
        "Nexus dataset manifest contains a record without a filename.",
      );
    }

    return {
      datasetId: record.dataset_id,
      filename,
      startTimestamp: record.start_timestamp,
      endTimestamp: record.end_timestamp,
      intervalMinutes: parsePositiveInteger(
        record.interval_minutes,
        "interval_minutes",
        filename,
      ),
      snapshotCount: parsePositiveInteger(
        record.snapshot_count,
        "snapshot_count",
        filename,
      ),
      expectedRowCount: parsePositiveInteger(
        record.row_count,
        "row_count",
        filename,
      ),
      columnCount: parsePositiveInteger(
        record.column_count,
        "column_count",
        filename,
      ),
      timezone: record.timezone,
      dataOrigin: record.data_origin,
      platform: record.platform,
      version: record.version,
    };
  });
}

export function loadNexusDatasetCatalog(
  repositoryRoot = process.cwd(),
): NexusDatasetCatalog {
  const manifestRecords = loadNexusDatasetManifest(repositoryRoot);

  const directoryPath = path.resolve(repositoryRoot, NEXUS_DATASET_DIRECTORY);

  const errors: string[] = [];

  const datasets = manifestRecords.map(
    (record): NexusDatasetValidationRecord => {
      const absolutePath = path.resolve(directoryPath, record.filename);

      const exists = fs.existsSync(absolutePath);

      if (!exists) {
        errors.push(`Missing dataset file: ${record.filename}`);

        return {
          ...record,
          exists: false,
          actualRowCount: 0,
          rowCountValid: false,
          startTimestampPresent: false,
          endTimestampPresent: false,
          valid: false,
          absolutePath,
        };
      }

      const content = fs.readFileSync(absolutePath, "utf8");

      const actualRowCount = countDataRows(content);

      const rowCountValid = actualRowCount === record.expectedRowCount;

      const startTimestampPresent = content.includes(record.startTimestamp);

      const endTimestampPresent = content.includes(record.endTimestamp);

      if (!rowCountValid) {
        errors.push(
          `${record.filename}: expected ${record.expectedRowCount} rows but found ${actualRowCount}.`,
        );
      }

      if (!startTimestampPresent) {
        errors.push(
          `${record.filename}: start timestamp ${record.startTimestamp} was not found.`,
        );
      }

      if (!endTimestampPresent) {
        errors.push(
          `${record.filename}: end timestamp ${record.endTimestamp} was not found.`,
        );
      }

      return {
        ...record,
        exists,
        actualRowCount,
        rowCountValid,
        startTimestampPresent,
        endTimestampPresent,
        valid:
          exists &&
          rowCountValid &&
          startTimestampPresent &&
          endTimestampPresent,
        absolutePath,
      };
    },
  );

  const intervalValues = new Set(
    datasets.map((dataset) => dataset.intervalMinutes),
  );

  const snapshotValues = new Set(
    datasets.map((dataset) => dataset.snapshotCount),
  );

  if (intervalValues.size > 1) {
    errors.push("Dataset bundle contains inconsistent replay intervals.");
  }

  if (snapshotValues.size > 1) {
    errors.push("Dataset bundle contains inconsistent snapshot counts.");
  }

  const validDatasetCount = datasets.filter((dataset) => dataset.valid).length;

  const totalRows = datasets.reduce(
    (total, dataset) => total + dataset.actualRowCount,
    0,
  );

  return {
    status:
      errors.length === 0 && validDatasetCount === datasets.length
        ? "ready"
        : "invalid",
    platform: datasets[0]?.platform ?? "LUMI Nexus",
    dataOrigin: datasets[0]?.dataOrigin ?? "simulated",
    physicalControlEnabled: false,
    directory: NEXUS_DATASET_DIRECTORY,
    manifestFile: NEXUS_DATASET_MANIFEST,
    intervalMinutes: intervalValues.size === 1 ? [...intervalValues][0] : null,
    snapshotCount: snapshotValues.size === 1 ? [...snapshotValues][0] : null,
    datasetCount: datasets.length,
    validDatasetCount,
    totalRows,
    datasets,
    errors,
  };
}
