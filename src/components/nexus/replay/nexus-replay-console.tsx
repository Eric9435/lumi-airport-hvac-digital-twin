"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isNexusReplaySpeed,
  NEXUS_REPLAY_SPEED_OPTIONS,
  useNexusReplayStore,
} from "@/store/nexus-replay-store";

import { NEXUS_REPLAY_SNAPSHOT_EVENT } from "@/components/runtime/nexus-replay-runtime";

interface ReplayDatasetSnapshot {
  datasetId: string;
  filename: string;
  rowCount: number;
  rows: Record<string, string>[];
}

interface ReplaySnapshot {
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
  datasets: ReplayDatasetSnapshot[];
}

interface ReplayErrorResponse {
  status: "error";
  message: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  "yia-power-distribution-24h-10min.csv": "Power Distribution",

  "yia-emergency-power-24h-10min.csv": "Emergency Power",

  "yia-energy-utilities-24h-10min.csv": "Energy & Utilities",

  "yia-safety-systems-24h-10min.csv": "Safety Systems",

  "yia-passenger-flow-24h-10min.csv": "Passenger Flow",

  "yia-flight-operations-24h-10min.csv": "Flight Operations",

  "yia-baggage-operations-24h-10min.csv": "Baggage Operations",

  "yia-airport-environment-24h-10min.csv": "Airport Environment",

  "yia-building-infrastructure-24h-10min.csv": "Building Infrastructure",

  "yia-platform-health-24h-10min.csv": "Platform Health",
};

function isReplayErrorResponse(
  payload: ReplaySnapshot | ReplayErrorResponse,
): payload is ReplayErrorResponse {
  return "status" in payload && payload.status === "error";
}

function formatVirtualTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatVirtualDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function getDomainLabel(filename: string): string {
  return DOMAIN_LABELS[filename] ?? filename;
}

export function NexusReplayConsole() {
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null);

  const requestSequenceRef = useRef(0);

  const {
    currentIndex,
    requestedIndex,
    speed,
    status,
    error,
    beginLoading,
    acceptSnapshot,
    setRequestedIndex,
    setSpeed,
    play,
    pause,
    reset,
    seek,
    fail,
  } = useNexusReplayStore();

  const loading = status === "loading";

  const playing = status === "playing";

  const loadSnapshot = useCallback(
    async (index: number, preservePlaying = false) => {
      const requestSequence = requestSequenceRef.current + 1;

      requestSequenceRef.current = requestSequence;

      beginLoading();

      try {
        const response = await fetch(`/api/nexus/replay?index=${index}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = (await response.json()) as
          ReplaySnapshot | ReplayErrorResponse;

        if (isReplayErrorResponse(payload)) {
          throw new Error(payload.message);
        }

        if (!response.ok) {
          throw new Error("Replay snapshot request failed.");
        }

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        setSnapshot(payload);

        acceptSnapshot(payload.index, payload.timestamp, payload.complete);

        if (preservePlaying && !payload.complete) {
          play();
        }
      } catch (caughtError) {
        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        fail(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the replay snapshot.",
        );
      }
    },
    [acceptSnapshot, beginLoading, fail, play],
  );

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadSnapshot(currentIndex);
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
    };
  }, [currentIndex, loadSnapshot]);

  useEffect(() => {
    function handleRuntimeSnapshot(event: Event): void {
      const replayEvent = event as CustomEvent<ReplaySnapshot>;

      setSnapshot(replayEvent.detail);
    }

    window.addEventListener(NEXUS_REPLAY_SNAPSHOT_EVENT, handleRuntimeSnapshot);

    return () => {
      window.removeEventListener(
        NEXUS_REPLAY_SNAPSHOT_EVENT,
        handleRuntimeSnapshot,
      );
    };
  }, []);

  function handlePlay(): void {
    if (!snapshot) {
      return;
    }

    if (snapshot.complete) {
      reset();
      play();
      return;
    }

    play();
  }

  function handlePause(): void {
    pause();
  }

  function handleReset(): void {
    reset();
  }

  function handlePrevious(): void {
    if (!snapshot || snapshot.index <= 0) {
      return;
    }

    pause();

    seek(snapshot.index - 1);
  }

  function handleNext(): void {
    if (!snapshot || snapshot.complete) {
      return;
    }

    pause();

    seek(snapshot.index + 1);
  }

  function handleTimelineCommit(): void {
    if (!snapshot) {
      return;
    }

    pause();

    seek(requestedIndex);
  }

  return (
    <section aria-labelledby="nexus-replay-title" className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-sm leading-6 text-cyan-100">
          This console runs synchronized operational datasets through a virtual
          airport timeline. Values are simulated, and physical equipment control
          remains disabled.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Runtime
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {playing ? "Running" : status === "error" ? "Error" : "Paused"}
          </p>

          <p className="mt-1 text-sm text-slate-500">Shared dataset replay</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Virtual Time
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot ? formatVirtualTime(snapshot.timestamp) : "--:--"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {snapshot ? formatVirtualDate(snapshot.timestamp) : "Loading"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Snapshot
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot
              ? `${snapshot.index + 1} / ${snapshot.snapshotCount}`
              : "--"}
          </p>

          <p className="mt-1 text-sm text-slate-500">10-minute interval</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Domain Inputs
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot?.datasetCount ?? "--"}
          </p>

          <p className="mt-1 text-sm text-slate-500">Synchronized datasets</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Snapshot Rows
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot?.totalRows ?? "--"}
          </p>

          <p className="mt-1 text-sm text-slate-500">Operational records</p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2
                id="nexus-replay-title"
                className="text-lg font-semibold text-white"
              >
                Operational Replay Controls
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Run the synchronized 24-hour airport scenario.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={playing ? handlePause : handlePlay}
                disabled={!snapshot || loading}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {playing ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={handlePrevious}
                disabled={!snapshot || snapshot.index === 0 || loading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!snapshot || snapshot.complete || loading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!snapshot || loading}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">Timeline progress</span>

              <span className="font-semibold text-cyan-300">
                {snapshot?.progressPercent.toFixed(2) ?? "0.00"}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-[width] duration-300"
                style={{
                  width: `${snapshot?.progressPercent ?? 0}%`,
                }}
              />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <label
                htmlFor="nexus-replay-index"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Replay timeline
              </label>

              <input
                id="nexus-replay-index"
                type="range"
                min={0}
                max={(snapshot?.snapshotCount ?? 144) - 1}
                step={1}
                value={requestedIndex}
                onChange={(event) => {
                  setRequestedIndex(Number(event.target.value));
                }}
                onMouseUp={handleTimelineCommit}
                onTouchEnd={handleTimelineCommit}
                disabled={!snapshot || loading}
                className="w-full accent-cyan-400 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="nexus-replay-speed"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Replay speed
              </label>

              <select
                id="nexus-replay-speed"
                value={speed}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  if (isNexusReplaySpeed(value)) {
                    setSpeed(value);
                  }
                }}
                className="min-w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                {NEXUS_REPLAY_SPEED_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <p role="status" className="text-sm text-cyan-300">
              Loading synchronized snapshot…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-semibold text-white">
            Synchronized Domain Snapshot
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Operational records active at the current virtual timestamp.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshot?.datasets.map((dataset) => (
            <div
              key={dataset.datasetId}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">
                    {getDomainLabel(dataset.filename)}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-600">
                    {dataset.filename}
                  </p>
                </div>

                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                  {dataset.rowCount} rows
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
