"use client";

import { CirclePower, Gauge, Snowflake, Waves } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useSimulationStore } from "@/store/simulation-store";

import type { ChillerState } from "@/types/hvac";

interface ChillerCardProps {
  chiller: ChillerState;
}

export function ChillerCard({ chiller }: ChillerCardProps) {
  const startChiller = useSimulationStore((state) => state.startChiller);

  const stopChiller = useSimulationStore((state) => state.stopChiller);

  const running = chiller.status === "running";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-cyan-400 uppercase">
            {chiller.id}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {chiller.name}
          </h3>
        </div>

        <StatusBadge status={chiller.status} />
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div
          className={[
            "flex h-24 w-24 items-center justify-center rounded-full border transition-all duration-300",
            running
              ? "border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
              : "border-slate-700 bg-slate-950",
          ].join(" ")}
        >
          <Snowflake
            size={48}
            className={
              running ? "animate-pulse text-cyan-300" : "text-slate-600"
            }
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Gauge size={14} />
            Load
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.loadPercent}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CirclePower size={14} />
            Power
          </div>
          <p className="mt-1 font-semibold text-white">{chiller.powerKw} kW</p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Snowflake size={14} />
            CHWS
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.chilledWaterSupplyTempC}°C
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Waves size={14} />
            Flow
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.chilledWaterFlowM3h} m³/h
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={running}
          onClick={() => startChiller(chiller.id)}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>

        <button
          type="button"
          disabled={!running}
          onClick={() => stopChiller(chiller.id)}
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Stop
        </button>
      </div>
    </article>
  );
}
