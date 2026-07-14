import type { SensorCsvRow } from "@/types/sensor-csv";

/*
 * At 1×, every ten-minute CSV snapshot receives ten real seconds.
 * Simulated plant timings remain proportional to the CSV timestamps,
 * while startup and shutdown stages remain visible to the operator.
 */
export const BASE_REPLAY_INTERVAL_MS = 10000;
export const MINIMUM_REPLAY_INTERVAL_MS = 100;
export const DEFAULT_CSV_INTERVAL_SECONDS = 10 * 60;

export function getReplayIntervalMilliseconds(speed: number): number {
  return Math.max(
    MINIMUM_REPLAY_INTERVAL_MS,
    BASE_REPLAY_INTERVAL_MS / Math.max(0.25, speed),
  );
}

export function getCsvIntervalSeconds(
  rows: SensorCsvRow[],
  currentIndex: number,
): number {
  const current = rows[currentIndex];
  const next = rows[currentIndex + 1];
  const previous = rows[currentIndex - 1];

  const currentMs = current ? Date.parse(current.timestamp) : Number.NaN;
  const nextMs = next ? Date.parse(next.timestamp) : Number.NaN;
  const previousMs = previous ? Date.parse(previous.timestamp) : Number.NaN;

  if (Number.isFinite(currentMs) && Number.isFinite(nextMs)) {
    return Math.max(1, Math.round((nextMs - currentMs) / 1000));
  }

  if (Number.isFinite(previousMs) && Number.isFinite(currentMs)) {
    return Math.max(1, Math.round((currentMs - previousMs) / 1000));
  }

  return DEFAULT_CSV_INTERVAL_SECONDS;
}

export function getNextCsvTimestamp(
  rows: SensorCsvRow[],
  currentIndex: number,
): string | null {
  return rows[currentIndex + 1]?.timestamp ?? null;
}

export function getSimulatedSecondsPerRealMillisecond(
  csvIntervalSeconds: number,
  replayIntervalMilliseconds: number,
): number {
  return csvIntervalSeconds / Math.max(1, replayIntervalMilliseconds);
}
