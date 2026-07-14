"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  HeartPulse,
  Upload,
  Wind,
} from "lucide-react";

import { useIndustrialDataStore } from "@/store/industrial-data-store";

function formatNumber(value: number, decimals = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function IndustrialDataDashboard() {
  const store = useIndustrialDataStore();

  const snapshot = store.getSnapshot();

  const issues = store.getIssues();

  const errors = issues.filter((issue) => issue.severity === "error");

  const warnings = issues.filter((issue) => issue.severity === "warning");

  const averageHealth =
    snapshot.equipment.length > 0
      ? snapshot.equipment.reduce(
          (total, equipment) => total + equipment.healthScore,
          0,
        ) / snapshot.equipment.length
      : 0;

  const totalEquipmentPower = snapshot.equipment.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const warningEquipment = snapshot.equipment.filter(
    (equipment) => equipment.healthScore < 80 || equipment.alarmCode,
  );

  async function upload(
    type: "ahu" | "condition" | "alarm",
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    const text = await file.text();

    if (type === "ahu") {
      store.importAhuCsv(file.name, text);
    }

    if (type === "condition") {
      store.importConditionCsv(file.name, text);
    }

    if (type === "alarm") {
      store.importAlarmCsv(file.name, text);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase">
            LUMI Industrial Data Platform
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-white">
            Equipment Condition and Indoor Environment
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
            Import AHU environmental sensors, rotating-equipment condition
            monitoring and event-based alarms. All datasets are synchronized by
            timestamp.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void store.loadSamples();
              }}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
            >
              Load All Samples
            </button>

            {[
              {
                type: "ahu" as const,
                label: "Upload AHU CSV",
              },
              {
                type: "condition" as const,
                label: "Upload Condition CSV",
              },
              {
                type: "alarm" as const,
                label: "Upload Alarm CSV",
              },
            ].map((item) => (
              <label
                key={item.type}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300"
              >
                <Upload className="h-4 w-4" />
                {item.label}

                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    void upload(item.type, event.target.files?.[0]);

                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ))}

            <button
              type="button"
              onClick={store.clear}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300"
            >
              Clear
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric
            label="Time Snapshots"
            value={String(store.timestamps.length)}
          />

          <Metric
            label="AHU Records"
            value={String(store.ahuResult?.validRowCount ?? 0)}
          />

          <Metric
            label="Condition Records"
            value={String(store.conditionResult?.validRowCount ?? 0)}
          />

          <Metric
            label="Alarm Events"
            value={String(store.alarmResult?.validRowCount ?? 0)}
          />

          <Metric label="Validation Errors" value={String(errors.length)} />

          <Metric label="Warnings" value={String(warnings.length)} />
        </section>

        {store.timestamps.length > 0 && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                  Synchronized Snapshot
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {snapshot.timestamp
                    ? new Date(snapshot.timestamp).toLocaleString()
                    : "No snapshot"}
                </h2>
              </div>

              <p className="text-sm text-slate-400">
                Record {store.currentTimestampIndex + 1} /{" "}
                {store.timestamps.length}
              </p>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, store.timestamps.length - 1)}
              value={store.currentTimestampIndex}
              onChange={(event) =>
                store.setTimestampIndex(Number(event.target.value))
              }
              className="mt-5 w-full accent-cyan-400"
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="AHUs" value={String(snapshot.ahus.length)} />

              <Metric
                label="Equipment"
                value={String(snapshot.equipment.length)}
              />

              <Metric
                label="Active Alarms"
                value={String(snapshot.activeAlarms.length)}
              />

              <Metric
                label="Average Health"
                value={`${formatNumber(averageHealth)}%`}
              />

              <Metric
                label="Equipment Power"
                value={`${formatNumber(totalEquipmentPower, 2)} kW`}
              />
            </div>
          </section>
        )}

        {snapshot.ahus.length > 0 && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <Wind className="h-5 w-5 text-cyan-300" />

              <div>
                <h2 className="text-xl font-semibold text-white">
                  AHU Environmental Sensors
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Temperature, humidity, IAQ, airflow, valve and damper
                  conditions.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.ahus.map((ahu) => (
                <article
                  key={ahu.equipmentId}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {ahu.equipmentId}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {ahu.zoneName}
                      </p>
                    </div>

                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 uppercase">
                      {ahu.communicationStatus}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Metric
                      label="Zone"
                      value={`${formatNumber(ahu.zoneTemperatureC)}°C`}
                    />

                    <Metric
                      label="Setpoint"
                      value={`${formatNumber(ahu.zoneSetpointC)}°C`}
                    />

                    <Metric
                      label="Humidity"
                      value={`${formatNumber(
                        ahu.zoneRelativeHumidityPercent,
                      )}%`}
                    />

                    <Metric
                      label="Supply Air"
                      value={`${formatNumber(ahu.supplyAirTemperatureC)}°C`}
                    />

                    <Metric
                      label="Airflow"
                      value={`${formatNumber(ahu.supplyAirflowCmh, 0)} CMH`}
                    />

                    <Metric
                      label="Valve"
                      value={`${formatNumber(ahu.coolingValvePercent)}%`}
                    />

                    <Metric
                      label="Filter DP"
                      value={`${formatNumber(
                        ahu.filterDifferentialPressurePa,
                        0,
                      )} Pa`}
                    />

                    <Metric
                      label="CO₂"
                      value={`${formatNumber(ahu.co2Ppm, 0)} ppm`}
                    />

                    <Metric
                      label="PM2.5"
                      value={`${formatNumber(ahu.pm25MicrogramsPerM3)} µg/m³`}
                    />

                    <Metric label="Occupancy" value={String(ahu.occupancy)} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {snapshot.equipment.length > 0 && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-violet-300" />

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Equipment Condition Monitoring
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Vibration, temperature, health score, failure probability and
                  RUL.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-3">Equipment</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Load</th>
                    <th className="px-3 py-3">Power</th>
                    <th className="px-3 py-3">Vibration</th>
                    <th className="px-3 py-3">Bearing</th>
                    <th className="px-3 py-3">Winding</th>
                    <th className="px-3 py-3">Health</th>
                    <th className="px-3 py-3">Failure</th>
                    <th className="px-3 py-3">RUL</th>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.equipment.map((equipment) => (
                    <tr
                      key={equipment.equipmentId}
                      className="border-t border-slate-800 text-slate-300"
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">
                          {equipment.equipmentId}
                        </p>

                        <p className="text-xs text-slate-500">
                          {equipment.equipmentType}
                        </p>
                      </td>

                      <td className="px-3 py-3">{equipment.status}</td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.loadPercent)}%
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.powerKw, 2)} kW
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.vibrationRmsMmPerSecond, 2)}{" "}
                        mm/s
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.bearingTemperatureC)}
                        °C
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.motorWindingTemperatureC)}
                        °C
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.healthScore)}%
                      </td>

                      <td className="px-3 py-3">
                        {formatNumber(equipment.failureProbabilityPercent, 2)}%
                      </td>

                      <td className="px-3 py-3">
                        {equipment.remainingUsefulLifeDays} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {snapshot.activeAlarms.length > 0 && (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-300" />

              <h2 className="text-xl font-semibold text-white">
                Active Alarm Events
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {snapshot.activeAlarms.map((alarm) => (
                <article
                  key={alarm.eventId}
                  className="rounded-2xl border border-red-500/20 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {alarm.alarmName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {alarm.equipmentId} · {alarm.alarmCode}
                      </p>
                    </div>

                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 uppercase">
                      {alarm.severity}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300">{alarm.message}</p>

                  <p className="mt-2 text-sm text-cyan-300">
                    Recommended: {alarm.recommendedAction}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {errors.length > 0 && (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
            <h2 className="text-xl font-semibold text-white">
              CSV Validation Errors
            </h2>

            <div className="mt-4 max-h-96 space-y-2 overflow-auto">
              {errors.map((issue, index) => (
                <p
                  key={`${issue.dataset}-${issue.rowNumber}-${issue.column}-${index}`}
                  className="rounded-xl border border-red-500/20 bg-slate-950/70 p-3 text-sm text-red-200"
                >
                  {issue.dataset} · Row {issue.rowNumber} · {issue.column}:{" "}
                  {issue.message}
                </p>
              ))}
            </div>
          </section>
        )}

        {warningEquipment.length > 0 && (
          <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-amber-300" />

              <h2 className="text-xl font-semibold text-white">
                Equipment Requiring Attention
              </h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {warningEquipment.map((equipment) => (
                <div
                  key={equipment.equipmentId}
                  className="rounded-2xl border border-amber-500/20 bg-slate-950/70 p-4"
                >
                  <p className="font-semibold text-white">
                    {equipment.equipmentId}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Health {formatNumber(equipment.healthScore)}%
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Failure probability{" "}
                    {formatNumber(equipment.failureProbabilityPercent, 2)}%
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Alarm {equipment.alarmCode ?? "None"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!snapshot.timestamp && (
          <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
            <Cpu className="mx-auto h-10 w-10 text-slate-600" />

            <h2 className="mt-4 text-xl font-semibold text-white">
              Load industrial datasets
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Use Load All Samples or upload the three CSV files.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
