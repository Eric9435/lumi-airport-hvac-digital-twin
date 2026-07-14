"use client";

import { Trash2 } from "lucide-react";

import { useSensorHistoryStore } from "@/store/sensor-history-store";

interface TrendMetric {
  key:
    "effectiveCoolingLoadKw" | "chwSupplyTempC" | "chwReturnTempC" | "powerKw";
  label: string;
  unit: string;
}

const metrics: TrendMetric[] = [
  {
    key: "effectiveCoolingLoadKw",
    label: "Effective Cooling Load",
    unit: "kW",
  },
  {
    key: "powerKw",
    label: "Plant Power",
    unit: "kW",
  },
  {
    key: "chwSupplyTempC",
    label: "CHW Supply",
    unit: "°C",
  },
  {
    key: "chwReturnTempC",
    label: "CHW Return",
    unit: "°C",
  },
];

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined) {
    return "Waiting";
  }

  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${unit}`;
}

function buildPolyline(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) {
    return "";
  }

  const minimum = Math.min(...values);

  const maximum = Math.max(...values);

  const range = Math.max(maximum - minimum, 0.001);

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;

      const y = height - ((value - minimum) / range) * height;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function TrendChart({ values }: { values: number[] }) {
  const width = 600;
  const height = 150;

  if (values.length < 2) {
    return (
      <div className="flex h-[170px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 text-sm text-slate-500">
        Waiting for at least two CSV snapshots
      </div>
    );
  }

  const polyline = buildPolyline(values, width, height);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[170px] w-full"
        role="img"
        aria-label="Live sensor trend"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="currentColor"
            className="text-slate-800"
            strokeWidth="1"
          />
        ))}

        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          className="text-cyan-400"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function SensorTrendPanel() {
  const history = useSensorHistoryStore((state) => state.history);

  const clearHistory = useSensorHistoryStore((state) => state.clearHistory);

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-cyan-400 uppercase">
            Time-Series Monitoring
          </p>

          <h3 className="mt-2 text-xl font-semibold text-white">
            Live Sensor Trends
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            One point is recorded for each applied CSV sensor snapshot.
          </p>
        </div>

        <button
          type="button"
          onClick={clearHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
        >
          <Trash2 className="h-4 w-4" />
          Clear trends
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <p className="text-[11px] text-slate-500 uppercase">
              {metric.label}
            </p>

            <p className="mt-2 font-semibold text-cyan-300">
              {formatValue(history.at(-1)?.[metric.key], metric.unit)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <TrendChart
          values={history.map((point) => point.effectiveCoolingLoadKw)}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
        <span>Data points: {history.length}</span>

        <span>Primary chart: Effective cooling load</span>
      </div>
    </section>
  );
}
