"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  NEXUS_REPLAY_SPEED_OPTIONS,
  useNexusReplayStore,
} from "@/store/nexus-replay-store";

export const NEXUS_REPLAY_SNAPSHOT_EVENT = "lumi:nexus-replay-snapshot";

interface NexusReplayDatasetSnapshot {
  datasetId: string;
  filename: string;
  rowCount: number;
  rows: Record<string, string>[];
}

export interface NexusReplayRuntimeSnapshot {
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

interface NexusReplayErrorResponse {
  status: "error";
  message: string;
}

function isReplayErrorResponse(
  payload: NexusReplayRuntimeSnapshot | NexusReplayErrorResponse,
): payload is NexusReplayErrorResponse {
  return "status" in payload && payload.status === "error";
}

function publishReplaySnapshot(snapshot: NexusReplayRuntimeSnapshot): void {
  window.dispatchEvent(
    new CustomEvent<NexusReplayRuntimeSnapshot>(NEXUS_REPLAY_SNAPSHOT_EVENT, {
      detail: snapshot,
    }),
  );
}

/**
 * Root-mounted Nexus operational replay runtime.
 *
 * This component owns the only automatic Nexus replay timer.
 * It remains mounted through route navigation because it is hosted by
 * LumiGlobalRuntimes in the application root layout.
 *
 * The runtime is simulation-only and never sends physical commands.
 */
export function NexusReplayRuntime() {
  const {
    currentIndex,
    speed,
    status,
    timestamp,
    snapshotCount,
    acceptSnapshot,
    fail,
  } = useNexusReplayStore();

  const requestSequenceRef = useRef(0);

  const loadedIndexRef = useRef<number | null>(null);

  const runtimeMountedRef = useRef(true);

  const selectedSpeed =
    NEXUS_REPLAY_SPEED_OPTIONS.find((option) => option.value === speed) ??
    NEXUS_REPLAY_SPEED_OPTIONS[2];

  const synchronizeSnapshot = useCallback(
    async (index: number): Promise<void> => {
      const requestSequence = requestSequenceRef.current + 1;

      requestSequenceRef.current = requestSequence;

      try {
        const response = await fetch(`/api/nexus/replay?index=${index}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json()) as
          NexusReplayRuntimeSnapshot | NexusReplayErrorResponse;

        if (isReplayErrorResponse(payload)) {
          throw new Error(payload.message);
        }

        if (!response.ok) {
          throw new Error("Nexus replay snapshot request failed.");
        }

        if (
          !runtimeMountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return;
        }

        loadedIndexRef.current = payload.index;

        acceptSnapshot(payload.index, payload.timestamp, payload.complete);

        publishReplaySnapshot(payload);
      } catch (caughtError) {
        if (
          !runtimeMountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return;
        }

        fail(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to synchronize the Nexus replay runtime.",
        );
      }
    },
    [acceptSnapshot, fail],
  );

  useEffect(() => {
    runtimeMountedRef.current = true;

    return () => {
      runtimeMountedRef.current = false;

      requestSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (loadedIndexRef.current === currentIndex && timestamp !== null) {
      return;
    }

    const synchronizationTimer = window.setTimeout(() => {
      void synchronizeSnapshot(currentIndex);
    }, 0);

    return () => {
      window.clearTimeout(synchronizationTimer);
    };
  }, [currentIndex, synchronizeSnapshot, timestamp]);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }

    const replayTimer = window.setTimeout(() => {
      if (timestamp === null) {
        void synchronizeSnapshot(currentIndex);
        return;
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex >= snapshotCount) {
        return;
      }

      void synchronizeSnapshot(nextIndex);
    }, selectedSpeed.delayMs);

    return () => {
      window.clearTimeout(replayTimer);
    };
  }, [
    currentIndex,
    selectedSpeed.delayMs,
    snapshotCount,
    status,
    synchronizeSnapshot,
    timestamp,
  ]);

  return null;
}
