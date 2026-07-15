"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function isReplayErrorResponse(
  payload: ReplaySnapshot | ReplayErrorResponse,
): payload is ReplayErrorResponse {
  return "status" in payload && payload.status === "error";
}

const REPLAY_SPEED_OPTIONS = [
  {
    label: "60×",
    value: 60,
    delayMs: 10_000,
  },
  {
    label: "120×",
    value: 120,
    delayMs: 5_000,
  },
  {
    label: "600×",
    value: 600,
    delayMs: 1_000,
  },
  {
    label: "1200×",
    value: 1200,
    delayMs: 500,
  },
] as const;

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

function domainLabel(filename: string): string {
  return DOMAIN_LABELS[filename] ?? filename;
}

export function NexusReplayConsole() {
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null);
  const [requestedIndex, setRequestedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSequenceRef = useRef(0);

  const selectedSpeed = useMemo(
    () =>
      REPLAY_SPEED_OPTIONS.find((option) => option.value === speed) ??
      REPLAY_SPEED_OPTIONS[2],
    [speed],
  );

  const loadSnapshot = useCallback(async (index: number) => {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    setLoading(true);
    setError(null);

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
      setRequestedIndex(payload.index);

      if (payload.complete) {
        setPlaying(false);
      }
    } catch (caughtError) {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setPlaying(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the replay snapshot.",
      );
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadSnapshot(0);
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
    };
  }, [loadSnapshot]);

  useEffect(() => {
    if (!playing || !snapshot) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextIndex = snapshot.index + 1;

      if (nextIndex >= snapshot.snapshotCount) {
        setPlaying(false);
        return;
      }

      void loadSnapshot(nextIndex);
    }, selectedSpeed.delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadSnapshot, playing, selectedSpeed.delayMs, snapshot]);

  function play(): void {
    if (!snapshot) {
      return;
    }

    if (snapshot.complete) {
      setPlaying(false);

      void loadSnapshot(0).then(() => {
        setPlaying(true);
      });

      return;
    }

    setPlaying(true);
  }

  function pause(): void {
    setPlaying(false);
  }

  function reset(): void {
    setPlaying(false);
    void loadSnapshot(0);
  }

  function goToPreviousSnapshot(): void {
    if (!snapshot || snapshot.index <= 0) {
      return;
    }

    setPlaying(false);
    void loadSnapshot(snapshot.index - 1);
  }

  function goToNextSnapshot(): void {
    if (!snapshot || snapshot.index >= snapshot.snapshotCount - 1) {
      return;
    }

    setPlaying(false);
    void loadSnapshot(snapshot.index + 1);
  }

  function applyRequestedIndex(): void {
    if (!snapshot) {
      return;
    }

    setPlaying(false);
    void loadSnapshot(requestedIndex);
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
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Runtime
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {playing ? "Running" : "Paused"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Dataset replay</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
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

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
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

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Domain Inputs
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot?.datasetCount ?? "--"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Synchronized datasets</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Snapshot Rows
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {snapshot?.totalRows ?? "--"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Operational records</p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
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
                onClick={playing ? pause : play}
                disabled={!snapshot || loading}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {playing ? "Pause" : "Play"}
              </button>

              <button
                type="button"
                onClick={goToPreviousSnapshot}
                disabled={!snapshot || snapshot.index === 0 || loading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={goToNextSnapshot}
                disabled={!snapshot || snapshot.complete || loading}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>

              <button
                type="button"
                onClick={reset}
                disabled={!snapshot || loading}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
                onChange={(event) =>
                  setRequestedIndex(Number(event.target.value))
                }
                onMouseUp={applyRequestedIndex}
                onTouchEnd={applyRequestedIndex}
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
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="min-w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                {REPLAY_SPEED_OPTIONS.map((option) => (
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

      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Synchronized Domain Snapshot
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Operational records active at the current virtual timestamp.
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-400">
            {snapshot?.timestamp ?? "No snapshot loaded"}
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
                    {domainLabel(dataset.filename)}
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

          {!snapshot && !loading && (
            <p className="text-sm text-slate-500">
              No synchronized snapshot is available.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
