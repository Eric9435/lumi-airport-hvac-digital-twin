"use client";

import { useEffect } from "react";

import { useHVACSequenceRuntime } from "@/store/hvac-sequence-runtime-store";

export default function HVACSequenceMonitor() {
  const tick = useHVACSequenceRuntime((s) => s.tick);

  const seconds = useHVACSequenceRuntime((s) => s.elapsed);

  const equipment = useHVACSequenceRuntime((s) => s.currentEquipment);

  const state = useHVACSequenceRuntime((s) => s.state);

  const events = useHVACSequenceRuntime((s) => s.events);

  useEffect(() => {
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  return (
    <section className="rounded-xl border border-cyan-700 bg-slate-950 p-5 text-white">
      <h2 className="text-xl font-bold">HVAC Live Sequence Timeline</h2>

      <p>Time: {seconds}s</p>

      <p>Equipment: {equipment}</p>

      <p>Status: {state}</p>

      <div className="mt-4 space-y-2">
        {events.slice(-8).map((e, i) => (
          <div key={i} className="rounded bg-slate-900 p-2">
            {e}
          </div>
        ))}
      </div>
    </section>
  );
}
