"use client";

import { useEffect } from "react";

import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";

export default function LivePlantSequenceTimeline() {
  const tick = usePlantSequenceRuntime((s) => s.tick);

  const elapsed = usePlantSequenceRuntime((s) => s.elapsed);

  const equipment = usePlantSequenceRuntime((s) => s.equipment);

  const action = usePlantSequenceRuntime((s) => s.action);

  const remaining = usePlantSequenceRuntime((s) => s.remaining);

  const events = usePlantSequenceRuntime((s) => s.events);

  useEffect(() => {
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  return (
    <section className="rounded-xl border border-cyan-700 bg-slate-950 p-5 text-white">
      <h2 className="text-xl font-bold">Live Plant Sequence Timeline</h2>

      <div className="mt-3 space-y-2">
        <p>Elapsed: {elapsed}s</p>

        <p>
          Current Equipment:
          <b>{equipment}</b>
        </p>

        <p>
          Action:
          {action}
        </p>

        <p>
          Remaining:
          {remaining}s
        </p>
      </div>

      <div className="mt-5">
        <h3 className="font-semibold">Sequence Event Log</h3>

        {events.slice(-10).map((event, index) => (
          <div key={index} className="mt-2 rounded bg-slate-900 p-2">
            {event}
          </div>
        ))}
      </div>
    </section>
  );
}
