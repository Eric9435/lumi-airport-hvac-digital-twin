"use client";

import { Activity, AlertTriangle, Plane, Snowflake, Zap } from "lucide-react";

import { AhuCard } from "@/components/ahu/ahu-card";
import { ChillerCard } from "@/components/chillers/chiller-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LumiCommandConsole } from "@/components/lumi/lumi-command-console";
import { useSimulationStore } from "@/store/simulation-store";

export function PlantDashboard() {
  const totalPowerKw = useSimulationStore((state) => state.totalPowerKw);

  const activeAlarmCount = useSimulationStore(
    (state) => state.activeAlarmCount,
  );

  const expectedPassengers = useSimulationStore(
    (state) => state.expectedPassengers,
  );

  const chillers = useSimulationStore((state) => state.chillers);

  const ahus = useSimulationStore((state) => state.ahus);

  const simulationRunning = useSimulationStore(
    (state) => state.simulationRunning,
  );

  const pauseSimulation = useSimulationStore((state) => state.pauseSimulation);

  const resumeSimulation = useSimulationStore(
    (state) => state.resumeSimulation,
  );

  const resetSimulation = useSimulationStore((state) => state.resetSimulation);

  const runningChillers = chillers.filter(
    (chiller) => chiller.status === "running",
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.32em] text-cyan-400 uppercase">
              LUMI Industrial Twin
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Airport HVAC Digital Twin
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Virtual water-cooled chiller plant, flight-aware AHU operations
              and conversational industrial control.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={simulationRunning ? pauseSimulation : resumeSimulation}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
            >
              {simulationRunning ? "Pause simulation" : "Resume simulation"}
            </button>

            <button
              type="button"
              onClick={resetSimulation}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Reset state
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            title="Plant Power"
            value={`${totalPowerKw} kW`}
            description="Current virtual electrical demand"
            icon={Zap}
          />

          <KpiCard
            title="Running Chillers"
            value={`${runningChillers} / ${chillers.length}`}
            description="Water-cooled chiller staging"
            icon={Snowflake}
          />

          <KpiCard
            title="Active AHUs"
            value={`${ahus.filter((ahu) => ahu.status === "running").length}`}
            description={`${ahus.length} airport zones configured`}
            icon={Activity}
          />

          <KpiCard
            title="Expected Passengers"
            value={expectedPassengers.toLocaleString()}
            description="Flight-aware demand context"
            icon={Plane}
          />

          <KpiCard
            title="Active Alarms"
            value={String(activeAlarmCount)}
            description="Current simulated alarm count"
            icon={AlertTriangle}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Chiller Plant
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Four virtual 11 kW water-cooled chillers
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {chillers.map((chiller) => (
                  <ChillerCard key={chiller.id} chiller={chiller} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Airport AHU Zones
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Interactive fan speed and temperature setpoint control
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {ahus.map((ahu) => (
                  <AhuCard key={ahu.id} ahu={ahu} />
                ))}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <LumiCommandConsole />
          </aside>
        </section>
      </div>
    </main>
  );
}
