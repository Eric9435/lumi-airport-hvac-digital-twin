"use client";

import { useEffect, useMemo } from "react";

import { PLANT_SEQUENCE_STEPS } from "@/lib/enterprise/plant-sequence-engine";
import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";

function getStepTiming(stepIndex: number) {
  const startSeconds = PLANT_SEQUENCE_STEPS.slice(0, stepIndex).reduce(
    (total, step) => total + step.duration,
    0,
  );

  const endSeconds =
    startSeconds + (PLANT_SEQUENCE_STEPS[stepIndex]?.duration ?? 0);

  return {
    startSeconds,
    endSeconds,
  };
}

export default function LivePlantSequenceTimeline() {
  const active = usePlantSequenceRuntime((state) => state.active);

  const completed = usePlantSequenceRuntime((state) => state.completed);

  const tick = usePlantSequenceRuntime((state) => state.tick);

  const reset = usePlantSequenceRuntime((state) => state.reset);

  const elapsed = usePlantSequenceRuntime((state) => state.elapsed);

  const equipment = usePlantSequenceRuntime((state) => state.equipment);

  const action = usePlantSequenceRuntime((state) => state.action);

  const remaining = usePlantSequenceRuntime((state) => state.remaining);

  const events = usePlantSequenceRuntime((state) => state.events);

  const totalDuration = useMemo(
    () =>
      PLANT_SEQUENCE_STEPS.reduce((total, step) => total + step.duration, 0),
    [],
  );

  const progress =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      : 0;

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      tick();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, tick]);

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-400 uppercase">
            CSV Runtime Sequence
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Live Plant Sequence Timeline
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Each plant stage displays its own live countdown before the next
            sequence starts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              active
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                : completed
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            {active ? "Sequence Running" : completed ? "Completed" : "Waiting"}
          </div>

          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">
            Current equipment
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {equipment || "Waiting for CSV demand"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">
            Current action
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {action || "No active sequence"}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs tracking-wider text-cyan-400 uppercase">
            Next sequence in
          </p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">
            {active ? `${remaining}s` : completed ? "0s" : "--"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs tracking-wider text-slate-500 uppercase">
            Total elapsed
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {elapsed}s / {totalDuration}s
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Sequence progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>

        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full rounded-full bg-cyan-400 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {PLANT_SEQUENCE_STEPS.map((step, index) => {
          const { startSeconds, endSeconds } = getStepTiming(index);

          const isRunning =
            active && elapsed >= startSeconds && elapsed < endSeconds;

          const isCompleted = completed || elapsed >= endSeconds;

          const status = isRunning
            ? `${Math.max(0, endSeconds - elapsed)}s remaining`
            : isCompleted
              ? "Completed"
              : "Waiting";

          return (
            <div
              key={step.id}
              className={`relative grid gap-3 rounded-2xl border px-4 py-4 md:grid-cols-[48px_1fr_auto] md:items-center ${
                isRunning
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  isRunning
                    ? "bg-cyan-400 text-slate-950"
                    : isCompleted
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                {index + 1}
              </div>

              <div>
                <p className="font-semibold text-white">{step.equipment}</p>

                <p className="mt-1 text-sm text-slate-400">{step.action}</p>

                <p className="mt-1 text-xs text-slate-600">
                  Duration: {step.duration}s · Timeline: {startSeconds}s–
                  {endSeconds}s
                </p>
              </div>

              <div
                className={`w-fit rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  isRunning
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                    : isCompleted
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-slate-700 bg-slate-900 text-slate-500"
                }`}
              >
                {status}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <h3 className="font-semibold text-white">Sequence Event Log</h3>

        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">
              Start CSV replay to trigger the automatic plant sequence.
            </p>
          ) : (
            events
              .slice()
              .reverse()
              .map((event, index) => (
                <div
                  key={`${event}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                >
                  {event}
                </div>
              ))
          )}
        </div>
      </div>
    </section>
  );
}
