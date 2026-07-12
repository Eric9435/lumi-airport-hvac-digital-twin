"use client";

import {
  Activity,
  CloudSun,
  Gauge,
  Thermometer,
  Users,
  Waves,
  Wind,
} from "lucide-react";

import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTemperatureState(errorC: number): {
  label: string;
  className: string;
} {
  if (errorC > 2) {
    return {
      label: "High",
      className: "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (errorC > 0.5) {
    return {
      label: "Cooling",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  if (errorC < -1) {
    return {
      label: "Low",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    };
  }

  return {
    label: "Normal",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

interface SummaryMetricProps {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

function SummaryMetric({ label, value, icon: Icon }: SummaryMetricProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-semibold tracking-wide uppercase">
          {label}
        </p>
      </div>

      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

export function DashboardAhuSensorOverview() {
  const filename = useSensorReplayStore((state) => state.filename);

  const rows = useSensorReplayStore((state) => state.rows);

  const currentIndex = useSensorReplayStore((state) => state.currentIndex);

  const replayStatus = useSensorReplayStore((state) => state.status);

  const replaySpeed = useSensorReplayStore((state) => state.speed);

  const currentRow = rows[currentIndex];

  if (!currentRow) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
            <Activity className="h-5 w-5 text-slate-400" />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-cyan-400 uppercase">
              Indoor Environmental Data
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              AHU Sensor Overview
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              No CSV sensor snapshot is currently loaded. Open Sensor CSV, load
              or upload a dataset and apply a snapshot to display live indoor
              conditions here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const requiredChillers = calculateRequiredChillerCount(
    currentRow.effectiveCoolingLoadKw,
  );

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-cyan-400 uppercase">
            CSV Sensor Replay
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            AHU Indoor Environment and Cooling Demand
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Indoor temperature, zone setpoints and cooling-valve demand from the
            currently applied CSV sensor snapshot.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 uppercase">
            {replayStatus}
          </span>

          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
            {replaySpeed}×
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              currentRow.sensorQuality === "GOOD"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {currentRow.sensorQuality}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-slate-500">Dataset</p>

            <p className="mt-1 text-sm font-semibold text-white">
              {filename ?? "Imported sensor dataset"}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Current snapshot</p>

            <p className="mt-1 text-sm font-semibold text-white">
              {formatTimestamp(currentRow.timestamp)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Record {currentIndex + 1} / {rows.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <SummaryMetric
          label="Passengers"
          value={currentRow.passengerCount.toLocaleString()}
          icon={Users}
        />

        <SummaryMetric
          label="Outdoor DB"
          value={`${formatNumber(currentRow.outdoorDryBulbC)}°C`}
          icon={CloudSun}
        />

        <SummaryMetric
          label="Outdoor WB"
          value={`${formatNumber(currentRow.outdoorWetBulbC)}°C`}
          icon={Waves}
        />

        <SummaryMetric
          label="Indoor Average"
          value={`${formatNumber(currentRow.averageZoneTemperatureC, 2)}°C`}
          icon={Thermometer}
        />

        <SummaryMetric
          label="Average Setpoint"
          value={`${formatNumber(currentRow.averageZoneSetpointC, 2)}°C`}
          icon={Gauge}
        />

        <SummaryMetric
          label="Average Error"
          value={`${
            currentRow.averageZoneTemperatureErrorC >= 0 ? "+" : ""
          }${formatNumber(currentRow.averageZoneTemperatureErrorC, 2)}°C`}
          icon={Thermometer}
        />

        <SummaryMetric
          label="Average Valve"
          value={`${formatNumber(currentRow.averageCoolingValvePercent)}%`}
          icon={Wind}
        />

        <SummaryMetric
          label="AHU Demand"
          value={`${formatNumber(currentRow.ahuCoolingDemandPercent)}%`}
          icon={Activity}
        />

        <SummaryMetric
          label="CHW Supply"
          value={`${formatNumber(currentRow.chwSupplyTempC)}°C`}
          icon={Waves}
        />

        <SummaryMetric
          label="CHW Return"
          value={`${formatNumber(currentRow.chwReturnTempC)}°C`}
          icon={Waves}
        />

        <SummaryMetric
          label="Base Load"
          value={`${formatNumber(currentRow.calculatedCoolingLoadKw, 2)} kW`}
          icon={Gauge}
        />

        <SummaryMetric
          label="Effective Load"
          value={`${formatNumber(currentRow.effectiveCoolingLoadKw, 2)} kW`}
          icon={Activity}
        />
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-cyan-400 uppercase">
              Automatic staging result
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Based on indoor-adjusted effective cooling load.
            </p>
          </div>

          <p className="text-2xl font-semibold text-white">
            {requiredChillers} / 4 Chillers
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Individual AHU Zones</h3>

            <p className="mt-1 text-xs text-slate-500">
              Actual indoor temperature compared with each zone setpoint.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {currentRow.ahus.map((ahu) => {
            const temperatureState = getTemperatureState(ahu.temperatureErrorC);

            return (
              <article
                key={ahu.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{ahu.id}</p>

                    <p className="mt-1 text-xs text-slate-500">
                      Indoor zone sensor
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${temperatureState.className}`}
                  >
                    {temperatureState.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[11px] text-slate-500 uppercase">
                      Zone temp
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {formatNumber(ahu.zoneTemperatureC)}
                      °C
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[11px] text-slate-500 uppercase">
                      Setpoint
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {formatNumber(ahu.setpointC)}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[11px] text-slate-500 uppercase">
                      Temp error
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {ahu.temperatureErrorC >= 0 ? "+" : ""}
                      {formatNumber(ahu.temperatureErrorC)}
                      °C
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <p className="text-[11px] text-slate-500 uppercase">
                      Valve
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {formatNumber(ahu.coolingValvePercent)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cooling demand</span>

                    <span className="font-semibold text-cyan-300">
                      {formatNumber(ahu.coolingDemandPercent)}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-[width]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ahu.coolingDemandPercent),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
