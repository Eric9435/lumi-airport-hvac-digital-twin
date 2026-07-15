import fs from "node:fs";
import path from "node:path";

import {
  loadNexusDatasetCatalog,
  type NexusDatasetValidationRecord,
} from "@/lib/nexus/datasets/nexus-dataset-catalog";

export const NEXUS_REPLAY_INTERVAL_MINUTES = 10;
export const NEXUS_REPLAY_SNAPSHOT_COUNT = 144;

export type NexusReplayRow = Record<string, string>;

export interface NexusReplayDatasetSnapshot {
  datasetId: string;
  filename: string;
  rowCount: number;
  rows: NexusReplayRow[];
}

export interface NexusReplaySnapshot {
  platform: "LUMI Nexus";
  runtimeMode: "dataset-replay";
  dataOrigin: "simulated";
  physicalControlEnabled: false;
  index: number;
  timestamp: string;
  previousTimestamp: string | null;
  nextTimestamp: string | null;
  intervalMinutes: number;
  snapshotCount: number;
  progressPercent: number;
  complete: boolean;
  datasetCount: number;
  totalRows: number;
  datasets: NexusReplayDatasetSnapshot[];
}

export interface NexusReplayBundle {
  platform: "LUMI Nexus";
  runtimeMode: "dataset-replay";
  dataOrigin: "simulated";
  physicalControlEnabled: false;
  intervalMinutes: number;
  snapshotCount: number;
  timestamps: string[];
  datasets: Map<string, Map<string, NexusReplayRow[]>>;
  datasetMetadata: Map<string, NexusDatasetValidationRecord>;
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

function parseCsv(content: string): NexusReplayRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  if (!headers.includes("timestamp")) {
    throw new Error("Replay dataset is missing the required timestamp column.");
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function groupRowsByTimestamp(
  rows: NexusReplayRow[],
): Map<string, NexusReplayRow[]> {
  const grouped = new Map<string, NexusReplayRow[]>();

  for (const row of rows) {
    const timestamp = row.timestamp;

    if (!timestamp) {
      throw new Error("Replay row contains no timestamp value.");
    }

    const existing = grouped.get(timestamp) ?? [];

    existing.push(row);
    grouped.set(timestamp, existing);
  }

  return grouped;
}

function validateSnapshotIndex(index: number, snapshotCount: number): void {
  if (!Number.isInteger(index)) {
    throw new Error(`Replay index must be an integer. Received: ${index}`);
  }

  if (index < 0 || index >= snapshotCount) {
    throw new RangeError(
      `Replay index ${index} is outside the valid range 0-${snapshotCount - 1}.`,
    );
  }
}

export function loadNexusReplayBundle(
  repositoryRoot = process.cwd(),
): NexusReplayBundle {
  const catalog = loadNexusDatasetCatalog(repositoryRoot);

  if (catalog.status !== "ready") {
    throw new Error(
      `Nexus dataset bundle is not ready: ${catalog.errors.join(" | ")}`,
    );
  }

  if (catalog.intervalMinutes !== NEXUS_REPLAY_INTERVAL_MINUTES) {
    throw new Error(
      `Expected a ${NEXUS_REPLAY_INTERVAL_MINUTES}-minute interval but received ${catalog.intervalMinutes}.`,
    );
  }

  if (catalog.snapshotCount !== NEXUS_REPLAY_SNAPSHOT_COUNT) {
    throw new Error(
      `Expected ${NEXUS_REPLAY_SNAPSHOT_COUNT} snapshots but received ${catalog.snapshotCount}.`,
    );
  }

  const datasets = new Map<string, Map<string, NexusReplayRow[]>>();

  const datasetMetadata = new Map<string, NexusDatasetValidationRecord>();

  const timestampSet = new Set<string>();

  for (const dataset of catalog.datasets) {
    const absolutePath = path.resolve(
      repositoryRoot,
      catalog.directory,
      dataset.filename,
    );

    const rows = parseCsv(fs.readFileSync(absolutePath, "utf8"));

    const grouped = groupRowsByTimestamp(rows);

    for (const timestamp of grouped.keys()) {
      timestampSet.add(timestamp);
    }

    datasets.set(dataset.datasetId, grouped);

    datasetMetadata.set(dataset.datasetId, dataset);
  }

  const timestamps = [...timestampSet].sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  );

  if (timestamps.length !== NEXUS_REPLAY_SNAPSHOT_COUNT) {
    throw new Error(
      `Expected ${NEXUS_REPLAY_SNAPSHOT_COUNT} unique replay timestamps but found ${timestamps.length}.`,
    );
  }

  for (const dataset of catalog.datasets) {
    const grouped = datasets.get(dataset.datasetId);

    if (!grouped) {
      throw new Error(
        `Replay grouping is missing for dataset ${dataset.filename}.`,
      );
    }

    for (const timestamp of timestamps) {
      if (!grouped.has(timestamp)) {
        throw new Error(
          `${dataset.filename} has no rows for synchronized timestamp ${timestamp}.`,
        );
      }
    }
  }

  return {
    platform: "LUMI Nexus",
    runtimeMode: "dataset-replay",
    dataOrigin: "simulated",
    physicalControlEnabled: false,
    intervalMinutes: NEXUS_REPLAY_INTERVAL_MINUTES,
    snapshotCount: NEXUS_REPLAY_SNAPSHOT_COUNT,
    timestamps,
    datasets,
    datasetMetadata,
  };
}

export function getNexusReplaySnapshot(
  bundle: NexusReplayBundle,
  index: number,
): NexusReplaySnapshot {
  validateSnapshotIndex(index, bundle.snapshotCount);

  const timestamp = bundle.timestamps[index];

  const datasets: NexusReplayDatasetSnapshot[] = [];

  let totalRows = 0;

  for (const [datasetId, groupedRows] of bundle.datasets) {
    const metadata = bundle.datasetMetadata.get(datasetId);

    if (!metadata) {
      throw new Error(`Replay metadata is missing for dataset ${datasetId}.`);
    }

    const rows = groupedRows.get(timestamp) ?? [];

    totalRows += rows.length;

    datasets.push({
      datasetId,
      filename: metadata.filename,
      rowCount: rows.length,
      rows,
    });
  }

  return {
    platform: "LUMI Nexus",
    runtimeMode: "dataset-replay",
    dataOrigin: "simulated",
    physicalControlEnabled: false,
    index,
    timestamp,
    previousTimestamp: index > 0 ? bundle.timestamps[index - 1] : null,
    nextTimestamp:
      index < bundle.snapshotCount - 1 ? bundle.timestamps[index + 1] : null,
    intervalMinutes: bundle.intervalMinutes,
    snapshotCount: bundle.snapshotCount,
    progressPercent: Number(
      (((index + 1) / bundle.snapshotCount) * 100).toFixed(2),
    ),
    complete: index === bundle.snapshotCount - 1,
    datasetCount: datasets.length,
    totalRows,
    datasets,
  };
}

export function findNexusReplayIndex(
  bundle: NexusReplayBundle,
  timestamp: string,
): number {
  const normalizedTimestamp = new Date(timestamp).toISOString();

  const index = bundle.timestamps.indexOf(normalizedTimestamp);

  if (index < 0) {
    throw new RangeError(
      `Timestamp ${normalizedTimestamp} is not part of the synchronized replay timeline.`,
    );
  }

  return index;
}

export function getNexusReplaySnapshotByTimestamp(
  bundle: NexusReplayBundle,
  timestamp: string,
): NexusReplaySnapshot {
  return getNexusReplaySnapshot(
    bundle,
    findNexusReplayIndex(bundle, timestamp),
  );
}
