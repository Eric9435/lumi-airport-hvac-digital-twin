"use client";

import {
  BrainCircuit,
  CheckCircle2,
  ClipboardPlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";

import { useCallback, useState } from "react";

import { analyzePlant } from "@/lib/diagnostics/diagnostic-engine";

import { useSimulationStore } from "@/store/simulation-store";

import type {
  DiagnosticFinding,
  MaintenanceWorkOrder,
  PlantDiagnosticReport,
} from "@/types/diagnostics";

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

function healthClass(status: PlantDiagnosticReport["operatingStatus"]): string {
  switch (status) {
    case "healthy":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

    case "attention-required":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    case "degraded":
      return "border-orange-500/40 bg-orange-500/10 text-orange-300";

    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-300";
  }
}

export function LumiIntelligencePanel() {
  const [report, setReport] = useState<PlantDiagnosticReport | null>(null);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const analyze = useCallback(() => {
    setLoading(true);
    setMessage(null);

    try {
      const result = analyzePlant(extractPlantState());

      setReport(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkOrder = useCallback(async (finding: DiagnosticFinding) => {
    setMessage(null);

    const response = await fetch("/api/maintenance/work-orders", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        finding,
      }),
    });

    const result = (await response.json()) as {
      success: boolean;
      workOrder?: MaintenanceWorkOrder;
      error?: string;
    };

    if (!response.ok || !result.success) {
      setMessage(result.error ?? "Work-order creation failed.");

      return;
    }

    setMessage(
      `Work order ${result.workOrder?.workOrderId ?? ""} created for ${finding.equipmentId}.`,
    );
  }, []);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit size={21} className="text-violet-300" />

            <h2 className="text-lg font-semibold text-white">
              LUMI Intelligence
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Plant diagnostics, recommendations and maintenance intelligence
          </p>
        </div>

        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Analyze plant
        </button>
      </header>

      <div className="p-5">
        {!report ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <BrainCircuit size={38} className="text-slate-600" />

            <p className="mt-4 font-medium text-slate-300">
              Plant analysis has not been run
            </p>

            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              LUMI will examine chiller efficiency, AHU airflow, filter
              pressure, indoor air quality, plant demand and operating
              conditions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Health score</p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.overallHealthScore}
                  <span className="text-base text-slate-500">/100</span>
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Findings</p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.findings.length}
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">Recommendations</p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.recommendations.length}
                </p>
              </article>
            </div>

            <div
              className={[
                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                healthClass(report.operatingStatus),
              ].join(" ")}
            >
              {report.operatingStatus.replaceAll("-", " ")}
            </div>

            {report.findings.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 size={22} className="text-emerald-300" />

                <div>
                  <p className="font-medium text-emerald-200">
                    No diagnostic issues detected
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Current virtual plant values are within configured
                    diagnostic limits.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {report.findings.map((finding) => (
                  <article
                    key={finding.findingId}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                          <ShieldAlert size={17} className="text-amber-300" />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {finding.equipmentId} · {finding.title}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {finding.summary}
                          </p>

                          <p className="mt-3 text-xs text-slate-500">
                            Confidence: {finding.confidencePercent}%
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void createWorkOrder(finding)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                      >
                        <ClipboardPlus size={14} />
                        Create work order
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Probable causes
                        </p>

                        <ul className="mt-2 space-y-1 text-sm text-slate-400">
                          {finding.probableCauses.map((cause) => (
                            <li key={cause}>• {cause}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                          Recommended actions
                        </p>

                        <ul className="mt-2 space-y-1 text-sm text-slate-400">
                          {finding.recommendedActions.map((action) => (
                            <li key={action}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {report.recommendations.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Wrench size={18} className="text-cyan-300" />

                  <h3 className="font-semibold text-white">
                    Recommended Actions
                  </h3>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {report.recommendations.map((recommendation) => (
                    <article
                      key={recommendation.recommendationId}
                      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
                    >
                      <p className="font-medium text-cyan-200">
                        {recommendation.title}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {recommendation.recommendedAction}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                          Confidence: {recommendation.confidencePercent}%
                        </span>

                        <span>·</span>

                        <span className="capitalize">
                          Risk: {recommendation.riskLevel}
                        </span>

                        {recommendation.estimatedEnergySavingPercent !==
                        null ? (
                          <>
                            <span>·</span>

                            <span>
                              Estimated saving:{" "}
                              {recommendation.estimatedEnergySavingPercent}%
                            </span>
                          </>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {message ? (
          <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
