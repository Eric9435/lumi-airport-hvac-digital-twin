"use client";

import { Download, FileBarChart, LoaderCircle } from "lucide-react";

import { useState } from "react";

import { useSimulationStore } from "@/store/simulation-store";

import type { DailyOperationalReport } from "@/types/operations";

import type { PlantState } from "@/types/hvac";

function extractState(): PlantState {
  const state = useSimulationStore.getState();

  return {
    timestamp: state.timestamp,
    simulationRunning: state.simulationRunning,
    simulationSpeed: state.simulationSpeed,
    operatingMode: state.operatingMode,
    totalPowerKw: state.totalPowerKw,
    totalEnergyKwh: state.totalEnergyKwh,
    activeAlarmCount: state.activeAlarmCount,
    expectedPassengers: state.expectedPassengers,
    chillers: state.chillers,
    ahus: state.ahus,
    chilledWaterPumps: state.chilledWaterPumps,
    condenserWaterPumps: state.condenserWaterPumps,
    coolingTowers: state.coolingTowers,
    flightDemand: state.flightDemand,
  };
}

export function DailyReportPanel() {
  const energyHistory = useSimulationStore((state) => state.energyHistory);

  const activeAlarms = useSimulationStore((state) => state.activeAlarms);

  const [report, setReport] = useState<DailyOperationalReport | null>(null);

  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);

    try {
      const response = await fetch("/api/reports/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: extractState(),
          energySamples: energyHistory,
          alarms: activeAlarms,
          totalFlights: 0,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        report: DailyOperationalReport;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Report generation failed.");
      }

      setReport(result.report);
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download = `lumi-daily-report-${report.reportDate}.json`;

    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart size={20} className="text-cyan-300" />

            <h2 className="text-lg font-semibold text-white">
              Daily Operational Report
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Executive HVAC performance summary
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generateReport()}
          disabled={loading}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate report"}
        </button>
      </header>

      <div className="p-5">
        {!report ? (
          <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
            {loading ? (
              <LoaderCircle size={24} className="animate-spin text-cyan-300" />
            ) : (
              "No report generated"
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Plant power</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {report.totalPlantPowerKw} kW
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Energy</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {report.totalEnergyKwh} kWh
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Average COP</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {report.averageChillerCop}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Availability</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {report.plantAvailabilityPercent}%
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Executive Summary
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {report.executiveSummary}
              </p>
            </div>

            <button
              type="button"
              onClick={exportReport}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <Download size={15} />
              Export JSON
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
