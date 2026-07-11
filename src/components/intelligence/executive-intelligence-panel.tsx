"use client";

import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Leaf,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react";

import { useState } from "react";

import { useSimulationStore } from "@/store/simulation-store";

import type { ExecutiveKpiSummary } from "@/types/intelligence";

import type { PlantState } from "@/types/hvac";

function extractPlantState(): PlantState {
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

function scoreClass(score: number): string {
  if (score >= 85) {
    return "text-emerald-300";
  }

  if (score >= 70) {
    return "text-cyan-300";
  }

  if (score >= 55) {
    return "text-amber-300";
  }

  return "text-red-300";
}

function riskClass(risk: "low" | "medium" | "high" | "critical"): string {
  switch (risk) {
    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-300";

    case "high":
      return "border-orange-500/40 bg-orange-500/10 text-orange-300";

    case "medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    default:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
}

export function ExecutiveIntelligencePanel() {
  const [summary, setSummary] = useState<ExecutiveKpiSummary | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/intelligence/summary", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          state: extractPlantState(),
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        summary?: ExecutiveKpiSummary;
        error?: string;
      };

      if (!response.ok || !result.success || !result.summary) {
        throw new Error(
          result.error ?? "Executive intelligence analysis failed.",
        );
      }

      setSummary(result.summary);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Executive intelligence analysis failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit size={21} className="text-violet-300" />

            <h2 className="text-lg font-semibold text-white">
              Executive Digital-Twin Intelligence
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            KPI scoring, reliability analytics, asset health and predictive
            maintenance
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : summary ? (
            <RefreshCw size={16} />
          ) : (
            <BrainCircuit size={16} />
          )}

          {summary ? "Refresh intelligence" : "Run intelligence analysis"}
        </button>
      </header>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!summary && !error ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <BrainCircuit size={42} className="text-slate-600" />

            <p className="mt-4 font-medium text-slate-300">
              Executive analysis has not been run
            </p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              The intelligence engine will calculate plant performance, asset
              health, reliability, comfort, energy efficiency, remaining useful
              life and maintenance risk.
            </p>
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-7">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Gauge size={15} />
                  Plant performance
                </div>

                <p
                  className={[
                    "mt-2 text-3xl font-semibold",
                    scoreClass(summary.plantPerformanceScore),
                  ].join(" ")}
                >
                  {summary.plantPerformanceScore}
                  <span className="text-base text-slate-500">/100</span>
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Activity size={15} />
                  Asset performance index
                </div>

                <p
                  className={[
                    "mt-2 text-3xl font-semibold",
                    scoreClass(summary.assetPerformanceIndex),
                  ].join(" ")}
                >
                  {summary.assetPerformanceIndex}
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={15} />
                  Availability
                </div>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {summary.reliability.availabilityPercent}%
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Wrench size={15} />
                  Predicted maintenance
                </div>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {summary.predictedMaintenanceCount}
                </p>
              </article>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                {
                  label: "Energy efficiency",
                  score: summary.energyEfficiencyScore,
                  icon: Zap,
                },
                {
                  label: "Reliability",
                  score: summary.reliabilityScore,
                  icon: ShieldCheck,
                },
                {
                  label: "Comfort",
                  score: summary.comfortScore,
                  icon: CheckCircle2,
                },
                {
                  label: "Air quality",
                  score: summary.indoorAirQualityScore,
                  icon: Activity,
                },
                {
                  label: "Sustainability",
                  score: summary.sustainabilityScore,
                  icon: Leaf,
                },
                {
                  label: "Average COP",
                  score: summary.averageChillerCop,
                  icon: Gauge,
                  isCop: true,
                },
              ].map(({ label, score, icon: Icon, isCop }) => (
                <article
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={14} />
                    {label}
                  </div>

                  <p
                    className={[
                      "mt-2 text-xl font-semibold",
                      isCop ? "text-cyan-300" : scoreClass(score),
                    ].join(" ")}
                  >
                    {score}
                    {!isCop ? "/100" : ""}
                  </p>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Executive Summary
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {summary.executiveSummary}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Estimated MTBF</p>

                  <p className="mt-1 font-semibold text-white">
                    {summary.reliability.estimatedMtbfHours} h
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Estimated MTTR</p>

                  <p className="mt-1 font-semibold text-white">
                    {summary.reliability.estimatedMttrHours} h
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Estimated energy saving
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {summary.estimatedEnergySavingPercent}%
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Carbon impact</p>

                  <p className="mt-1 font-semibold text-white">
                    {summary.estimatedCarbonKg} kg
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <TriangleAlert size={18} className="text-amber-300" />

                <h3 className="font-semibold text-white">Priority Actions</h3>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {summary.priorityActions.map((action) => (
                  <article
                    key={action}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-slate-300"
                  >
                    {action}
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-cyan-300" />

                  <h3 className="font-semibold text-white">
                    Lowest Asset Health Scores
                  </h3>
                </div>

                <span className="text-xs text-slate-500">
                  {summary.equipmentHealth.length} assets evaluated
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Asset</th>

                      <th className="px-4 py-3">Health</th>

                      <th className="px-4 py-3">Risk</th>

                      <th className="px-4 py-3">Efficiency</th>

                      <th className="px-4 py-3">RUL</th>

                      <th className="px-4 py-3">Primary issue</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {summary.equipmentHealth.slice(0, 8).map((asset) => (
                      <tr key={asset.equipmentId}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">
                            {asset.equipmentId}
                          </p>

                          <p className="text-xs text-slate-500">
                            {asset.equipmentName}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "font-semibold",
                              scoreClass(asset.healthScore),
                            ].join(" ")}
                          >
                            {asset.healthScore}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "rounded-full border px-2 py-1 text-xs capitalize",
                              riskClass(asset.riskLevel),
                            ].join(" ")}
                          >
                            {asset.riskLevel}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {asset.efficiencyScore}%
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {asset.remainingUsefulLifeDays === null
                            ? "No immediate limit"
                            : `${asset.remainingUsefulLifeDays} days`}
                        </td>

                        <td className="max-w-xs px-4 py-3 text-slate-400">
                          {asset.primaryIssue ?? "Normal condition"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock3 size={18} className="text-violet-300" />

                <h3 className="font-semibold text-white">
                  Predictive Maintenance Forecast
                </h3>
              </div>

              {summary.predictiveMaintenance.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  No immediate predictive-maintenance action is required.
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {summary.predictiveMaintenance
                    .slice(0, 6)
                    .map((prediction) => (
                      <article
                        key={prediction.predictionId}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {prediction.equipmentId} ·{" "}
                              {prediction.predictedIssue}
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              {prediction.recommendedAction}
                            </p>
                          </div>

                          <span
                            className={[
                              "rounded-full border px-2 py-1 text-xs capitalize",
                              riskClass(prediction.riskLevel),
                            ].join(" ")}
                          >
                            {prediction.riskLevel}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-slate-500">Probability</p>

                            <p className="mt-1 font-semibold text-white">
                              {prediction.probabilityPercent}%
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-slate-500">Complete within</p>

                            <p className="mt-1 font-semibold text-white">
                              {prediction.recommendedCompletionDays} days
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
