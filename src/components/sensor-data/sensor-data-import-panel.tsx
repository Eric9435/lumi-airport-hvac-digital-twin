"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Download,
  FileCheck2,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Thermometer,
  Trash2,
  Upload,
  Users,
  Waves,
  Wind,
  XCircle,
} from "lucide-react";

import { groupOperationalWarnings } from "@/lib/sensor-data/group-sensor-warnings";
import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Unavailable";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getZoneState(errorC: number): {
  label: string;
  className: string;
} {
  if (errorC > 3) {
    return {
      label: "Critical demand",
      className: "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (errorC > 1) {
    return {
      label: "Cooling demand",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  if (errorC < -1) {
    return {
      label: "Below setpoint",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    };
  }

  return {
    label: "Normal",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />

        <p className="text-[11px] tracking-wide uppercase">{label}</p>
      </div>

      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function SensorDataImportPanel() {
  const replay = useSensorReplayStore();

  const plant = useEnterprisePlantStore();

  const currentRow = replay.rows[replay.currentIndex];

  const requiredChillers = currentRow
    ? calculateRequiredChillerCount(currentRow.effectiveCoolingLoadKw)
    : 0;

  const validationErrors =
    replay.validation?.issues.filter((issue) => issue.severity === "error") ??
    [];

  const operationalWarnings = groupOperationalWarnings(
    replay.validation?.issues ?? [],
    replay.rows,
  );

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      window.alert("Please select a CSV file.");

      return;
    }

    const csvText = await file.text();

    replay.importCsvText(file.name, csvText);
  }

  const progress =
    replay.rows.length > 1
      ? (replay.currentIndex / (replay.rows.length - 1)) * 100
      : 0;

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase">
                Sensor Data Acquisition
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                24-Hour CSV Import and Replay
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Upload and validate timestamped airport HVAC sensor data. The
                replay applies occupancy, weather, chilled-water conditions, AHU
                indoor temperatures and cooling-valve demand to the plant
                topology.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/data/yia-24h-10min.csv"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 hover:border-cyan-500/50"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>

              <button
                type="button"
                onClick={() => {
                  void replay.loadSampleCsv();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
              >
                <FileCheck2 className="h-4 w-4" />
                Load Sample
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-300">
                <Upload className="h-4 w-4" />
                Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);

                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {replay.filename ?? "No CSV selected"}
                </p>

                <p className="mt-1 text-xs text-slate-500">{replay.message}</p>
              </div>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 uppercase">
                {replay.status}
              </span>
            </div>

            {replay.validation && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Source Records"
                  value={String(replay.validation.sourceRowCount)}
                  icon={Activity}
                />

                <MetricCard
                  label="Valid Records"
                  value={String(replay.validation.validRowCount)}
                  icon={CheckCircle2}
                />

                <MetricCard
                  label="Invalid Records"
                  value={String(replay.validation.invalidRowCount)}
                  icon={XCircle}
                />

                <MetricCard
                  label="Operational Warning Groups"
                  value={String(operationalWarnings.length)}
                  icon={AlertTriangle}
                />
              </div>
            )}
          </div>
        </section>

        {currentRow && (
          <>
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                    Current CSV Snapshot
                  </p>

                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {formatTimestamp(currentRow.timestamp)}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={replay.stepBackward}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-300"
                    aria-label="Previous snapshot"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {replay.status === "playing" ? (
                    <button
                      type="button"
                      onClick={replay.pause}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={replay.play}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300"
                    >
                      <Play className="h-4 w-4" />
                      Play Replay
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={replay.stepForward}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-300"
                    aria-label="Next snapshot"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={replay.applyLatest}
                    className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
                  >
                    Apply Latest
                  </button>

                  <button
                    type="button"
                    onClick={replay.resetReplay}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={replay.clearImport}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-[width]"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Snapshot {replay.currentIndex + 1} / {replay.rows.length}
                  </span>

                  <span>{formatNumber(progress, 0)}%</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Replay speed:</span>

                {[0.5, 1, 2, 5, 10, 20].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => replay.setSpeed(speed)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      replay.speed === speed
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-700 bg-slate-950 text-slate-400"
                    }`}
                  >
                    {speed}×
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <MetricCard
                  label="Passengers"
                  value={currentRow.passengerCount.toLocaleString()}
                  icon={Users}
                />

                <MetricCard
                  label="Staff"
                  value={currentRow.staffCount.toLocaleString()}
                  icon={Users}
                />

                <MetricCard
                  label="Active Flights"
                  value={String(currentRow.activeFlights)}
                  icon={Activity}
                />

                <MetricCard
                  label="Outdoor DB"
                  value={`${formatNumber(currentRow.outdoorDryBulbC)}°C`}
                  icon={CloudSun}
                />

                <MetricCard
                  label="Outdoor WB"
                  value={`${formatNumber(currentRow.outdoorWetBulbC)}°C`}
                  icon={Waves}
                />

                <MetricCard
                  label="Outdoor RH"
                  value={`${formatNumber(currentRow.outdoorRhPercent)}%`}
                  icon={CloudSun}
                />

                <MetricCard
                  label="Indoor Average"
                  value={`${formatNumber(
                    currentRow.averageZoneTemperatureC,
                    2,
                  )}°C`}
                  icon={Thermometer}
                />

                <MetricCard
                  label="Average Setpoint"
                  value={`${formatNumber(
                    currentRow.averageZoneSetpointC,
                    2,
                  )}°C`}
                  icon={Gauge}
                />

                <MetricCard
                  label="Average Zone Error"
                  value={`${
                    currentRow.averageZoneTemperatureErrorC >= 0 ? "+" : ""
                  }${formatNumber(
                    currentRow.averageZoneTemperatureErrorC,
                    2,
                  )}°C`}
                  icon={Thermometer}
                />

                <MetricCard
                  label="Average Valve"
                  value={`${formatNumber(
                    currentRow.averageCoolingValvePercent,
                  )}%`}
                  icon={Wind}
                />

                <MetricCard
                  label="CHW Supply"
                  value={`${formatNumber(currentRow.chwSupplyTempC)}°C`}
                  icon={Waves}
                />

                <MetricCard
                  label="CHW Return"
                  value={`${formatNumber(currentRow.chwReturnTempC)}°C`}
                  icon={Waves}
                />

                <MetricCard
                  label="Base Cooling Load"
                  value={`${formatNumber(
                    currentRow.calculatedCoolingLoadKw,
                    2,
                  )} kW`}
                  icon={Gauge}
                />

                <MetricCard
                  label="Effective Cooling Load"
                  value={`${formatNumber(
                    currentRow.effectiveCoolingLoadKw,
                    2,
                  )} kW`}
                  icon={Activity}
                />

                <MetricCard
                  label="Required Chillers"
                  value={`${requiredChillers} / 4`}
                  icon={Activity}
                />

                <MetricCard
                  label="Sensor Quality"
                  value={currentRow.sensorQuality}
                  icon={CheckCircle2}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-400 uppercase">
                  Indoor Environmental Sensors
                </p>

                <h3 className="mt-2 text-xl font-semibold text-white">
                  AHU Zone Conditions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Zone temperature, setpoint, temperature error, cooling-valve
                  position and derived demand for each AHU.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {currentRow.ahus.map((ahu) => {
                  const state = getZoneState(ahu.temperatureErrorC);

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
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${state.className}`}
                        >
                          {state.label}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MetricCard
                          label="Zone Temp"
                          value={`${formatNumber(ahu.zoneTemperatureC)}°C`}
                          icon={Thermometer}
                        />

                        <MetricCard
                          label="Setpoint"
                          value={`${formatNumber(ahu.setpointC)}°C`}
                          icon={Gauge}
                        />

                        <MetricCard
                          label="Temp Error"
                          value={`${
                            ahu.temperatureErrorC >= 0 ? "+" : ""
                          }${formatNumber(ahu.temperatureErrorC)}°C`}
                          icon={Thermometer}
                        />

                        <MetricCard
                          label="Cooling Valve"
                          value={`${formatNumber(ahu.coolingValvePercent)}%`}
                          icon={Wind}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            Derived cooling demand
                          </span>

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
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h3 className="text-xl font-semibold text-white">
                Automatic Plant Result
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Required chiller groups are calculated from the indoor-adjusted
                effective cooling load. Each running group maps its transformer,
                primary chilled-water pump, condenser-water pump, cooling-tower
                fans, starter and chiller.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {plant.groups.map((group, index) => {
                  const shouldRun = index < requiredChillers;

                  return (
                    <div
                      key={group.groupId}
                      className={`rounded-2xl border p-4 ${
                        shouldRun
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-slate-800 bg-slate-950/60"
                      }`}
                    >
                      <p className="font-semibold text-white">
                        {group.chillerId}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {group.transformerId} → {group.primaryPumpId} →{" "}
                        {group.condenserPumpId} → {group.starterId}
                      </p>

                      <p className="mt-3 text-sm font-semibold text-slate-300">
                        {shouldRun
                          ? "CSV AUTO — REQUIRED"
                          : "CSV AUTO — STANDBY"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {validationErrors.length > 0 && (
          <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-300" />

              <div>
                <h3 className="text-xl font-semibold text-white">
                  CSV Validation Errors
                </h3>

                <p className="mt-1 text-sm text-red-200/70">
                  Correct these data errors before replay.
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
              {validationErrors.map((issue, index) => (
                <div
                  key={`${issue.rowNumber}-${issue.column}-${index}`}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                >
                  Row {issue.rowNumber} · {issue.column}: {issue.message}
                </div>
              ))}
            </div>
          </section>
        )}

        {operationalWarnings.length > 0 && (
          <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300" />

              <div>
                <h3 className="text-xl font-semibold text-white">
                  Operational Warning Summary
                </h3>

                <p className="mt-1 text-sm text-amber-200/70">
                  These are operating-condition warnings, not CSV validation
                  failures.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {operationalWarnings.map((warning) => (
                <article
                  key={`${warning.key}-${warning.startRowNumber}`}
                  className="rounded-2xl border border-amber-500/20 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {warning.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Field: {warning.field}
                      </p>
                    </div>

                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 uppercase">
                      {warning.occurrenceCount} records
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-[11px] text-slate-500 uppercase">
                        CSV rows
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {warning.startRowNumber === warning.endRowNumber
                          ? warning.startRowNumber
                          : `${warning.startRowNumber}–${warning.endRowNumber}`}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                      <p className="text-[11px] text-slate-500 uppercase">
                        Period
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {formatTimestamp(warning.startTimestamp)}
                      </p>

                      {warning.endTimestamp !== warning.startTimestamp && (
                        <p className="mt-1 text-xs text-slate-500">
                          to {formatTimestamp(warning.endTimestamp)}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-amber-100/80">
                    {warning.message}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
