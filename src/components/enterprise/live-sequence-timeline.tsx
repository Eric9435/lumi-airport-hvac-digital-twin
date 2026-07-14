"use client";

import { useEffect } from "react";

import { useSequenceTimelineStore } from "@/store/sequence-timeline-store";

export default function LiveSequenceTimeline() {
  const tick = useSequenceTimelineStore((s) => s.tick);

  const seconds = useSequenceTimelineStore((s) => s.seconds);

  const events = useSequenceTimelineStore((s) => s.events);

  useEffect(() => {
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  return (
    <section className="rounded-xl border border-cyan-700 bg-slate-950 p-5 text-white">
      <h2 className="text-xl font-bold">Live Plant Sequence</h2>

      <p>
        Elapsed:
        {seconds}s
      </p>

      <div className="mt-4 space-y-2">
        {events.slice(-10).map((event, index) => (
          <div key={index} className="rounded bg-slate-900 p-2">
            {event}
          </div>
        ))}
      </div>
    </section>
  );
}
