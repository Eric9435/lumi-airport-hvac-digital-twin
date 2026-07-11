"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { useSimulationStore } from "@/store/simulation-store";

import type { AlarmLevel } from "@/types/hvac";

function alarmStyle(level: AlarmLevel): string {
  switch (level) {
    case "critical":
      return "border-red-500/40 bg-red-500/10";

    case "high":
      return "border-orange-500/40 bg-orange-500/10";

    case "warning":
      return "border-amber-500/40 bg-amber-500/10";

    case "information":
      return "border-cyan-500/40 bg-cyan-500/10";

    default:
      return "border-slate-800 bg-slate-950/70";
  }
}

function AlarmIcon({ level }: { level: AlarmLevel }) {
  if (level === "critical") {
    return <ShieldAlert size={20} className="text-red-300" />;
  }

  if (level === "high" || level === "warning") {
    return <AlertTriangle size={20} className="text-amber-300" />;
  }

  return <AlertCircle size={20} className="text-cyan-300" />;
}

export function AlarmCenter() {
  const alarms = useSimulationStore((state) => state.activeAlarms);

  const acknowledgeAlarm = useSimulationStore(
    (state) => state.acknowledgeAlarm,
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-300" />

            <h2 className="text-lg font-semibold text-white">Alarm Center</h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Rule-based virtual HVAC alarm detection
          </p>
        </div>

        <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
          {alarms.length}
        </div>
      </header>

      <div className="space-y-3 p-5">
        {alarms.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 size={34} className="text-emerald-400" />

            <p className="mt-3 font-medium text-emerald-300">
              No active alarms
            </p>

            <p className="mt-1 text-sm text-slate-500">
              All monitored virtual HVAC parameters are within configured
              limits.
            </p>
          </div>
        ) : (
          alarms.map((alarm) => (
            <article
              key={alarm.alarmId}
              className={[
                "rounded-xl border p-4",
                alarmStyle(alarm.alarmLevel),
                alarm.acknowledged ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <AlarmIcon level={alarm.alarmLevel} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">
                        {alarm.equipmentId} · {alarm.alarmCode}
                      </p>

                      <p className="mt-1 text-sm text-slate-300">
                        {alarm.message}
                      </p>
                    </div>

                    <span className="rounded-full border border-current/20 px-2 py-1 text-xs font-semibold text-slate-300 uppercase">
                      {alarm.alarmLevel}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-400">
                    <p>
                      Current:{" "}
                      <span className="font-medium text-white">
                        {alarm.measuredValue} {alarm.unit}
                      </span>
                    </p>

                    <p>
                      Threshold: {alarm.thresholdValue} {alarm.unit}
                    </p>

                    <p>Probable cause: {alarm.probableCause}</p>

                    <p>Recommended action: {alarm.recommendedAction}</p>
                  </div>

                  <button
                    type="button"
                    disabled={alarm.acknowledged}
                    onClick={() => acknowledgeAlarm(alarm.alarmId)}
                    className="mt-4 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {alarm.acknowledged ? "Acknowledged" : "Acknowledge alarm"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
