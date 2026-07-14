"use client";

import { useSensorHistoryStore } from "@/store/sensor-history-store";

export default function SensorTrendPanel() {
  const history = useSensorHistoryStore((state) => state.history);

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-white">
      <h2 className="text-xl font-bold">Live Sensor Trends</h2>

      <p className="text-sm text-slate-400">
        Virtual BMS time-series monitoring
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <TrendCard
          title="Cooling Load"
          value={
            history.length ? `${history.at(-1)?.coolingLoadKw} kW` : "Waiting"
          }
        />

        <TrendCard
          title="CHWS"
          value={
            history.length ? `${history.at(-1)?.chwSupplyTempC} °C` : "Waiting"
          }
        />

        <TrendCard
          title="CHWR"
          value={
            history.length ? `${history.at(-1)?.chwReturnTempC} °C` : "Waiting"
          }
        />

        <TrendCard
          title="AHU Demand"
          value={
            history.length ? `${history.at(-1)?.ahuDemandPercent}%` : "Waiting"
          }
        />
      </div>

      <div className="mt-6 text-sm text-slate-400">
        Data points: {history.length}
      </div>
    </section>
  );
}

function TrendCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
      <p className="text-slate-400">{title}</p>

      <p className="mt-2 text-xl font-bold text-cyan-400">{value}</p>
    </div>
  );
}
