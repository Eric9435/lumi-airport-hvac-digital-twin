"use client";

import { useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  CloudSun,
  Gauge,
  Thermometer,
  Users,
  Waves,
  Wind,
} from "lucide-react";

import SensorTrendPanel from "@/components/dashboard/sensor-trend-panel";
import { useSensorHistoryStore } from "@/store/sensor-history-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";
import { useSimulationStore } from "@/store/simulation-store";

interface SensorCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  status?: string;
}

function SensorCard({ label, value, icon: Icon, status }: SensorCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon className="h-4 w-4" />

          <p className="text-[11px] tracking-wide uppercase">{label}</p>
        </div>

        {status && (
          <span className="text-[10px] font-semibold text-emerald-300 uppercase">
            {status}
          </span>
        )}
      </div>

      <p className="mt-3 text-lg font-semibold text-cyan-300">{value}</p>
    </article>
  );
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function LiveSensorMonitoringPanel() {
  const rows = useSensorReplayStore((state) => state.rows);

  const currentIndex = useSensorReplayStore((state) => state.currentIndex);

  const replayStatus = useSensorReplayStore((state) => state.status);

  const filename = useSensorReplayStore((state) => state.filename);

  const totalPowerKw = useSimulationStore((state) => state.totalPowerKw);

  const addHistoryPoint = useSensorHistoryStore((state) => state.addPoint);

  const snapshot = rows[currentIndex];

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    if (
      replayStatus === "empty" ||
      replayStatus === "ready" ||
      replayStatus === "error"
    ) {
      return;
    }

    addHistoryPoint({
      timestamp: snapshot.timestamp,
      coolingLoadKw: snapshot.calculatedCoolingLoadKw,
      effectiveCoolingLoadKw: snapshot.effectiveCoolingLoadKw,
      chwSupplyTempC: snapshot.chwSupplyTempC,
      chwReturnTempC: snapshot.chwReturnTempC,
      powerKw: totalPowerKw,
      ahuDemandPercent: snapshot.ahuCoolingDemandPercent,
      passengers: snapshot.passengerCount,
    });
  }, [addHistoryPoint, replayStatus, snapshot, totalPowerKw]);

  if (!snapshot) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold text-white">
          LUMI Live Sensor Monitoring
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          No sensor snapshot is available. Load a CSV dataset and start replay.
        </p>
      </section>
    );
  }

  const communicationStatus =
    snapshot.sensorQuality === "GOOD" || snapshot.sensorQuality === "UNCERTAIN"
      ? "ONLINE"
      : "DEGRADED";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-cyan-400 uppercase">
            Monitoring Only
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            LUMI Live Sensor Monitoring
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Virtual real-time sensor values streamed from the active CSV replay.
            Equipment control remains in the LUMI Command Center.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">Dataset</p>

          <p className="mt-1 text-sm font-semibold text-slate-200">
            {filename ?? "Unknown dataset"}
          </p>

          <p className="mt-1 text-xs text-cyan-300 uppercase">{replayStatus}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SensorCard
          label="Outdoor DB"
          value={`${formatNumber(snapshot.outdoorDryBulbC)} °C`}
          icon={CloudSun}
          status={communicationStatus}
        />

        <SensorCard
          label="Outdoor WB"
          value={`${formatNumber(snapshot.outdoorWetBulbC)} °C`}
          icon={Waves}
        />

        <SensorCard
          label="Outdoor RH"
          value={`${formatNumber(snapshot.outdoorRhPercent)} %`}
          icon={CloudSun}
        />

        <SensorCard
          label="Passengers"
          value={snapshot.passengerCount.toLocaleString()}
          icon={Users}
        />

        <SensorCard
          label="CHW Supply"
          value={`${formatNumber(snapshot.chwSupplyTempC)} °C`}
          icon={Thermometer}
        />

        <SensorCard
          label="CHW Return"
          value={`${formatNumber(snapshot.chwReturnTempC)} °C`}
          icon={Thermometer}
        />

        <SensorCard
          label="Base Cooling Load"
          value={`${formatNumber(snapshot.calculatedCoolingLoadKw, 2)} kW`}
          icon={Gauge}
        />

        <SensorCard
          label="Effective Load"
          value={`${formatNumber(snapshot.effectiveCoolingLoadKw, 2)} kW`}
          icon={Activity}
        />

        <SensorCard
          label="Plant Power"
          value={`${formatNumber(totalPowerKw, 2)} kW`}
          icon={Activity}
        />

        <SensorCard
          label="AHU Demand"
          value={`${formatNumber(snapshot.ahuCoolingDemandPercent)} %`}
          icon={Wind}
        />

        <SensorCard
          label="Indoor Average"
          value={`${formatNumber(snapshot.averageZoneTemperatureC, 2)} °C`}
          icon={Thermometer}
        />

        <SensorCard
          label="Sensor Quality"
          value={snapshot.sensorQuality}
          icon={CheckCircle2}
          status={communicationStatus}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">AHU Sensor Network</h3>

        <p className="mt-1 text-sm text-slate-400">
          Current zone temperature, setpoint, valve demand and derived cooling
          demand for all six AHUs.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.ahus.map((ahu) => (
            <article
              key={ahu.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{ahu.id}</p>

                <span className="text-xs text-emerald-300">ONLINE</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Zone</p>

                  <p className="mt-1 text-cyan-300">
                    {formatNumber(ahu.zoneTemperatureC)}
                    °C
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Setpoint</p>

                  <p className="mt-1">
                    {formatNumber(ahu.setpointC)}
                    °C
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Valve</p>

                  <p className="mt-1">
                    {formatNumber(ahu.coolingValvePercent)}%
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">Demand</p>

                  <p className="mt-1">
                    {formatNumber(ahu.coolingDemandPercent)}%
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <SensorTrendPanel />
    </section>
  );
}
