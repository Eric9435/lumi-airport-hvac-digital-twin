"use client";

import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  LoaderCircle,
  Play,
} from "lucide-react";

import { useState } from "react";

import { simulationScenarios } from "@/data/demo/simulation-scenarios";

import { useSimulationStore } from "@/store/simulation-store";

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

export function ScenarioPanel() {
  const hydrate = useSimulationStore((state) => state.hydrate);

  const [runningId, setRunningId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  async function executeScenario(scenarioId: string) {
    setRunningId(scenarioId);

    setMessage(null);

    try {
      const response = await fetch("/api/scenarios/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId,
          state: extractState(),
          actor: "Dashboard Operator",
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        execution?: {
          scenarioName: string;
          resultingState: PlantState;
        };
      };

      if (!response.ok || !result.success || !result.execution) {
        throw new Error(result.error ?? "Scenario execution failed.");
      }

      hydrate(result.execution.resultingState);

      setMessage(`${result.execution.scenarioName} applied successfully.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Scenario execution failed.",
      );
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-2">
          <Beaker size={20} className="text-violet-300" />

          <h2 className="text-lg font-semibold text-white">
            Simulation Scenarios
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Test demand, failure, emergency and energy scenarios
        </p>
      </header>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        {simulationScenarios.map((scenario) => {
          const running = runningId === scenario.scenarioId;

          return (
            <article
              key={scenario.scenarioId}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{scenario.name}</p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {scenario.description}
                  </p>
                </div>

                {scenario.severity === "critical" ? (
                  <AlertTriangle size={19} className="shrink-0 text-red-300" />
                ) : (
                  <CheckCircle2 size={19} className="shrink-0 text-cyan-300" />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{scenario.durationMinutes} min</span>

                <span>·</span>

                <span>Passenger ×{scenario.passengerMultiplier}</span>

                <span>·</span>

                <span>
                  {scenario.ambientTemperatureC}
                  °C
                </span>
              </div>

              <button
                type="button"
                disabled={runningId !== null}
                onClick={() => void executeScenario(scenario.scenarioId)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Play size={15} />
                )}
                Execute scenario
              </button>
            </article>
          );
        })}
      </div>

      {message ? (
        <div className="mx-5 mb-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}
