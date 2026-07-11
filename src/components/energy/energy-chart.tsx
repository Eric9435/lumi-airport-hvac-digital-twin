"use client";

import {
  Activity,
  BatteryCharging,
  Gauge,
  Leaf,
  Trash2,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { calculateEnergySummary } from "@/lib/energy/energy-engine";

import { useSimulationStore } from "@/store/simulation-store";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function EnergyChart() {
  const energyHistory = useSimulationStore((state) => state.energyHistory);

  const clearEnergyHistory = useSimulationStore(
    (state) => state.clearEnergyHistory,
  );

  const summary = calculateEnergySummary(energyHistory);

  const chartData = energyHistory.map((sample) => ({
    ...sample,
    time: formatTime(sample.timestamp),
  }));

  const cards = [
    {
      label: "Current Power",
      value: `${summary.currentPowerKw} kW`,
      icon: Zap,
    },
    {
      label: "Energy",
      value: `${summary.totalEnergyKwh} kWh`,
      icon: BatteryCharging,
    },
    {
      label: "Peak Demand",
      value: `${summary.peakPowerKw} kW`,
      icon: Gauge,
    },
    {
      label: "Estimated Saving",
      value: `${summary.estimatedSavingPercent}%`,
      icon: Leaf,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-cyan-300" />

            <h2 className="text-lg font-semibold text-white">
              Live Energy Analytics
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Continuous virtual plant power and energy tracking
          </p>
        </div>

        <button
          type="button"
          onClick={clearEnergyHistory}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
        >
          <Trash2 size={15} />
          Clear history
        </button>
      </header>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <article
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Icon size={14} />
                {label}
              </div>

              <p className="mt-2 text-xl font-semibold text-white">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 h-80">
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
              Collecting simulation energy samples...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="powerGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />

                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  unit=" kW"
                />

                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                  labelStyle={{
                    color: "#94a3b8",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="totalPowerKw"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#powerGradient)"
                  name="Plant Power"
                  unit=" kW"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
