"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";

import { calculateRequiredChillerCount } from "@/lib/sensor-data/sensor-csv-parser";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function SensorDataImportPanel() {
  const replay = useSensorReplayStore();
  const plant = useEnterprisePlantStore();

  const currentRow = replay.rows[replay.currentIndex];

  const requiredChillers = currentRow
    ? calculateRequiredChillerCount(currentRow.calculatedCoolingLoadKw)
    : 0;

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
              Upload timestamped airport sensor data, validate every row,
              preview cooling demand and automatically stage complete chiller
              groups.
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
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-xs text-slate-500">Source records</p>
                <p className="mt-1 font-semibold text-white">
                  {replay.validation.sourceRowCount}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-400">Valid records</p>
                <p className="mt-1 font-semibold text-white">
                  {replay.validation.validRowCount}
                </p>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">Invalid records</p>
                <p className="mt-1 font-semibold text-white">
                  {replay.validation.invalidRowCount}
                </p>
              </div>
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
                  {new Date(currentRow.timestamp).toLocaleString()}
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
              {[
                ["Passengers", currentRow.passengerCount.toLocaleString()],
                ["Staff", currentRow.staffCount.toLocaleString()],
                ["Active flights", currentRow.activeFlights],
                ["Outdoor DB", `${formatNumber(currentRow.outdoorDryBulbC)}°C`],
                ["Outdoor WB", `${formatNumber(currentRow.outdoorWetBulbC)}°C`],
                ["Outdoor RH", `${formatNumber(currentRow.outdoorRhPercent)}%`],
                ["Solar load", `${formatNumber(currentRow.solarLoadPercent)}%`],
                [
                  "AHU demand",
                  `${formatNumber(currentRow.ahuCoolingDemandPercent)}%`,
                ],
                ["CHWS", `${formatNumber(currentRow.chwSupplyTempC)}°C`],
                ["CHWR", `${formatNumber(currentRow.chwReturnTempC)}°C`],
                [
                  "Cooling load",
                  `${formatNumber(currentRow.calculatedCoolingLoadKw, 2)} kW`,
                ],
                ["Required chillers", `${requiredChillers} / 4`],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <p className="text-[11px] tracking-wide text-slate-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-xl font-semibold text-white">
              Automatic Plant Result
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Required groups are calculated from CSV cooling load. Each active
              group maps its Transformer, Primary Pump, Condenser Pump,
              Cooling-Tower Fans, Star–Delta Starter and Chiller.
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
                      {shouldRun ? "CSV AUTO — REQUIRED" : "CSV AUTO — STANDBY"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {replay.validation && replay.validation.issues.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-xl font-semibold text-white">
            Validation Issues
          </h3>

          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {replay.validation.issues.slice(0, 100).map((issue, index) => (
              <div
                key={`${issue.rowNumber}-${issue.column}-${index}`}
                className={`rounded-xl border p-3 text-sm ${
                  issue.severity === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                Row {issue.rowNumber} · {issue.column}: {issue.message}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
