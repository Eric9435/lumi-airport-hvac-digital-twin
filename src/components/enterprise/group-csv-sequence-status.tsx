"use client";

import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";

interface GroupCsvSequenceStatusProps {
  groupId: string;
  chillerId: string;
}

function formatCsvTime(value: string | null): string {
  if (!value) {
    return "End of dataset";
  }

  return new Date(value).toLocaleTimeString();
}

export function GroupCsvSequenceStatus({
  groupId,
  chillerId,
}: GroupCsvSequenceStatusProps) {
  const progress = usePlantSequenceRuntime(
    (state) => state.groupProgress[groupId],
  );
  const targetChillers = usePlantSequenceRuntime(
    (state) => state.targetChillers,
  );
  const csvTimestamp = usePlantSequenceRuntime((state) => state.csvTimestamp);
  const nextCsvTimestamp = usePlantSequenceRuntime(
    (state) => state.nextCsvTimestamp,
  );

  if (!csvTimestamp) {
    return null;
  }

  const groupNumber = Number(groupId.replace("GROUP-", ""));

  if (!progress) {
    const required = groupNumber <= targetChillers;

    return (
      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
              CSV Demand State
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {required
                ? `${chillerId} target maintained; no new sequence required.`
                : `${chillerId} is not required by this CSV snapshot.`}
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400">
            {required ? "Maintained" : "Standby"}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          CSV {formatCsvTime(csvTimestamp)} → {formatCsvTime(nextCsvTimestamp)}
        </p>
      </div>
    );
  }

  const percent =
    progress.totalSeconds > 0
      ? Math.min(100, (progress.elapsedSeconds / progress.totalSeconds) * 100)
      : 0;

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 ${
        progress.status === "running"
          ? "border-cyan-500/40 bg-cyan-500/5"
          : progress.status === "completed"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cyan-400 uppercase">
            CSV {progress.direction === "startup" ? "Startup" : "Shutdown"}
          </p>
          <p className="mt-1 font-medium text-white">
            {progress.currentAction}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {progress.currentEquipment} · {progress.currentStepRemainingSeconds}
            s simulated remaining
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            progress.status === "running"
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
              : progress.status === "completed"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }`}
        >
          {progress.status}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
        <div
          className="h-full rounded-full bg-cyan-400 transition-[width] duration-100"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
        <span>
          {Math.round(progress.elapsedSeconds)}s / {progress.totalSeconds}s
          simulated
        </span>
        <span>
          CSV {formatCsvTime(progress.csvTimestamp)} →{" "}
          {formatCsvTime(progress.nextCsvTimestamp)}
        </span>
      </div>
    </div>
  );
}
