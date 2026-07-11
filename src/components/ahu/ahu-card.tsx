"use client";

import { Activity, Thermometer, Wind, Zap } from "lucide-react";

import { AnimatedFan } from "@/components/digital-twin/animated-fan";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSimulationStore } from "@/store/simulation-store";

import type { AhuState } from "@/types/hvac";

interface AhuCardProps {
  ahu: AhuState;
}

export function AhuCard({ ahu }: AhuCardProps) {
  const setAhuFanSpeed = useSimulationStore((state) => state.setAhuFanSpeed);

  const setAhuSetpoint = useSimulationStore((state) => state.setAhuSetpoint);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-cyan-400 uppercase">
            {ahu.id}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {ahu.zoneName}
          </h3>
        </div>

        <StatusBadge status={ahu.status} />
      </div>

      <div className="mt-6 flex justify-center">
        <AnimatedFan
          running={ahu.status === "running"}
          speedPercent={ahu.fanSpeedPercent}
        />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wind size={14} />
            Airflow
          </div>
          <p className="mt-1 font-semibold text-white">
            {ahu.airflowCmh.toLocaleString()} CMH
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Thermometer size={14} />
            Zone
          </div>
          <p className="mt-1 font-semibold text-white">{ahu.zoneTempC}°C</p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity size={14} />
            Setpoint
          </div>
          <p className="mt-1 font-semibold text-white">{ahu.setpointC}°C</p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Zap size={14} />
            Power
          </div>
          <p className="mt-1 font-semibold text-white">{ahu.powerKw} kW</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Fan speed</span>
          <span>{ahu.fanSpeedPercent}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={ahu.fanSpeedPercent}
          onChange={(event) =>
            setAhuFanSpeed(ahu.id, Number(event.target.value))
          }
          className="mt-2 w-full accent-cyan-400"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label
          htmlFor={`${ahu.id}-setpoint`}
          className="text-xs text-slate-400"
        >
          Setpoint
        </label>

        <input
          id={`${ahu.id}-setpoint`}
          type="number"
          min="16"
          max="30"
          step="0.5"
          value={ahu.setpointC}
          onChange={(event) =>
            setAhuSetpoint(ahu.id, Number(event.target.value))
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
      </div>
    </article>
  );
}
