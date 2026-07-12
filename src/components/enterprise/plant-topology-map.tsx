"use client";

import { useState } from "react";
import { Activity, Fan, Snowflake, Waves, X, Zap } from "lucide-react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import {
  formatMmk,
  formatRuntime,
  Metric,
  StatusPill,
} from "@/components/enterprise/plant-ui-helpers";

type SelectedNode =
  | {
      type: "transformer";
      id: string;
    }
  | {
      type: "tower";
      id: string;
    }
  | {
      type: "fan";
      id: string;
    }
  | {
      type: "starter";
      id: string;
    }
  | null;

function flowClass(active: boolean): string {
  return active
    ? "animate-pulse bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.75)]"
    : "bg-slate-700";
}

export function PlantTopologyMap() {
  const state = useEnterprisePlantStore();
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);

  const selectedTransformer =
    selectedNode?.type === "transformer"
      ? state.transformers.find((item) => item.id === selectedNode.id)
      : undefined;

  const selectedTower =
    selectedNode?.type === "tower"
      ? state.coolingTowers.find((item) => item.id === selectedNode.id)
      : selectedNode?.type === "fan"
        ? state.coolingTowers.find((tower) =>
            tower.fans.some((fan) => fan.id === selectedNode.id),
          )
        : undefined;

  const selectedFan =
    selectedNode?.type === "fan"
      ? selectedTower?.fans.find((fan) => fan.id === selectedNode.id)
      : undefined;

  const selectedStarter =
    selectedNode?.type === "starter"
      ? state.starters.find((item) => item.id === selectedNode.id)
      : undefined;

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <div className="min-w-[1180px] space-y-8">
          <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase">
                Interactive Digital Twin
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Airport HVAC Plant Topology
              </h2>
            </div>

            <div className="flex gap-2">
              <StatusPill status={state.sequenceState} />
              <StatusPill status={state.coolingTowerRedundancyStatus} />
            </div>
          </header>

          <section>
            <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-6 py-4">
              <Zap className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="font-semibold text-white">
                  11 kV Incoming Supply
                </p>
                <p className="text-xs text-cyan-300">
                  Common high-voltage source
                </p>
              </div>
            </div>

            <div className="mx-auto h-8 w-1 bg-cyan-500/60" />

            <div className="grid grid-cols-4 gap-5">
              {state.transformers.map((transformer, index) => {
                const suffix = String(index + 1).padStart(2, "0");

                const primaryPump = state.primaryPumps[index];

                const condenserPump = state.condenserPumps[index];

                const starter = state.starters[index];

                const energized = transformer.status === "energized";

                const evaporatorFlow = primaryPump?.flowProven ?? false;

                const condenserFlow = condenserPump?.flowProven ?? false;

                return (
                  <div
                    key={transformer.id}
                    className="flex flex-col items-center"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedNode({
                          type: "transformer",
                          id: transformer.id,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-cyan-500/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">
                            {transformer.id}
                          </p>
                          <p className="text-xs text-slate-500">
                            11 kV / 400 V
                          </p>
                        </div>
                        <StatusPill status={transformer.status} />
                      </div>
                      <div className="mt-3 text-xs text-slate-400">
                        Load {transformer.loadPercent.toFixed(1)}%
                      </div>
                    </button>

                    <div className={`h-8 w-1 ${flowClass(energized)}`} />

                    <div className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center">
                      <p className="text-sm font-medium text-white">
                        MCC-{suffix}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {transformer.lvBreakerClosed
                          ? "LV breaker closed"
                          : "LV breaker open"}
                      </p>
                    </div>

                    <div className={`h-8 w-1 ${flowClass(energized)}`} />

                    <div className="grid w-full grid-cols-2 gap-2">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <Waves className="mx-auto h-4 w-4 text-blue-300" />
                        <p className="mt-2 text-center text-xs font-semibold text-white">
                          {primaryPump?.id}
                        </p>
                        <p className="mt-1 text-center text-[10px] text-slate-500">
                          {evaporatorFlow ? "Flow proven" : "No flow"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <Waves className="mx-auto h-4 w-4 text-amber-300" />
                        <p className="mt-2 text-center text-xs font-semibold text-white">
                          {condenserPump?.id}
                        </p>
                        <p className="mt-1 text-center text-[10px] text-slate-500">
                          {condenserFlow ? "Flow proven" : "No flow"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-8 w-1 ${flowClass(
                        evaporatorFlow && condenserFlow && energized,
                      )}`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedNode({
                          type: "starter",
                          id: starter.id,
                        })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-violet-500/50"
                    >
                      <p className="text-sm font-semibold text-white">
                        {starter.id}
                      </p>
                      <div className="mt-2 flex justify-center">
                        <StatusPill status={starter.status} />
                      </div>
                    </button>

                    <div
                      className={`h-8 w-1 ${flowClass(
                        starter.status === "delta-running",
                      )}`}
                    />

                    <div className="w-full rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
                      <Snowflake className="mx-auto h-5 w-5 text-sky-300" />
                      <p className="mt-2 font-semibold text-white">
                        CH-{suffix}
                      </p>
                      <p className="mt-1 text-xs text-sky-200">
                        {starter.status === "delta-running"
                          ? "Running"
                          : "Standby"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-blue-500/40" />
              <div className="rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-2 text-sm font-semibold text-blue-200">
                Common Chilled-Water Header
              </div>
              <div className="h-px flex-1 bg-blue-500/40" />
            </div>

            <div className="mt-5 grid grid-cols-[220px_220px_1fr] gap-5">
              {state.secondaryPumps.map((pump) => (
                <div
                  key={pump.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <p className="font-semibold text-white">{pump.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {pump.dutyRole} · {pump.speedPercent.toFixed(0)}%
                  </p>
                  <div className="mt-3">
                    <StatusPill status={pump.status} />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-6 gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={`AHU-${index + 1}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-center"
                  >
                    <Activity className="mx-auto h-4 w-4 text-emerald-300" />
                    <p className="mt-2 text-xs font-semibold text-white">
                      AHU-{String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-amber-500/40" />
              <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm font-semibold text-amber-200">
                Common Condenser-Water Header
              </div>
              <div className="h-px flex-1 bg-amber-500/40" />
            </div>

            <div className="mt-5 grid grid-cols-4 gap-5">
              {state.coolingTowers.map((tower) => (
                <article
                  key={tower.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-amber-500/50"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNode({
                        type: "tower",
                        id: tower.id,
                      })
                    }
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="font-semibold text-white">{tower.id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tower.role}
                      </p>
                    </div>
                    <StatusPill status={tower.status} />
                  </button>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {tower.fans.map((fan) => (
                      <button
                        key={fan.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNode({
                            type: "fan",
                            id: fan.id,
                          });
                        }}
                        className={`rounded-lg border p-2 ${
                          fan.status === "running"
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-950"
                        }`}
                        title={fan.id}
                        aria-label={`Open ${fan.id} diagnostics`}
                      >
                        <Fan
                          className={`mx-auto h-4 w-4 ${
                            fan.status === "running"
                              ? "animate-spin text-emerald-300"
                              : "text-slate-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-950 p-2">
                      <p className="text-slate-500">Leaving water</p>
                      <p className="mt-1 font-semibold text-white">
                        {tower.leavingWaterTemperatureC.toFixed(1)}
                        °C
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-950 p-2">
                      <p className="text-slate-500">Heat rejection</p>
                      <p className="mt-1 font-semibold text-white">
                        {tower.currentHeatRejectionKw.toFixed(1)} kW
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {[
              ["Running / Healthy", "bg-emerald-400"],
              ["Starting / Warning", "bg-amber-400"],
              ["Stopped", "bg-slate-500"],
              ["Fault / Trip", "bg-red-400"],
              ["Automatic / Energized", "bg-cyan-400"],
              ["Manual Override", "bg-violet-400"],
            ].map(([label, color]) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs text-slate-400"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </section>
        </div>
      </div>

      {selectedNode && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-950 p-5 shadow-2xl shadow-black/60">
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>

          {selectedTransformer && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs tracking-[0.2em] text-cyan-400 uppercase">
                  Transformer Detail
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedTransformer.id}
                </h3>
                <div className="mt-3">
                  <StatusPill status={selectedTransformer.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Associated chiller"
                  value={selectedTransformer.associatedChillerId}
                />
                <Metric label="Mode" value={selectedTransformer.mode} />
                <Metric
                  label="Primary"
                  value={`${selectedTransformer.primaryVoltageKv.toFixed(1)} kV`}
                />
                <Metric
                  label="Secondary"
                  value={`${selectedTransformer.secondaryVoltageV.toFixed(0)} V`}
                />
                <Metric
                  label="Active power"
                  value={`${selectedTransformer.activePowerKw.toFixed(2)} kW`}
                />
                <Metric
                  label="Apparent power"
                  value={`${selectedTransformer.apparentPowerKva.toFixed(2)} kVA`}
                />
                <Metric
                  label="Power factor"
                  value={selectedTransformer.powerFactor.toFixed(2)}
                />
                <Metric
                  label="Load"
                  value={`${selectedTransformer.loadPercent.toFixed(1)}%`}
                />
                <Metric
                  label="Primary current"
                  value={`${selectedTransformer.primaryCurrentA.toFixed(2)} A`}
                />
                <Metric
                  label="Secondary current"
                  value={`${selectedTransformer.secondaryCurrentA.toFixed(2)} A`}
                />
                <Metric
                  label="Oil temperature"
                  value={`${selectedTransformer.oilTemperatureC.toFixed(1)}°C`}
                />
                <Metric
                  label="Winding temperature"
                  value={`${selectedTransformer.windingTemperatureC.toFixed(1)}°C`}
                />
                <Metric
                  label="Runtime"
                  value={formatRuntime(selectedTransformer.runtimeSeconds)}
                />
                <Metric
                  label="Energy"
                  value={`${selectedTransformer.totalEnergyKwh.toFixed(3)} kWh`}
                />
              </div>
            </div>
          )}

          {selectedTower && !selectedFan && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs tracking-[0.2em] text-amber-400 uppercase">
                  Cooling Tower Detail
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedTower.id}
                </h3>
                <div className="mt-3">
                  <StatusPill status={selectedTower.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric label="Role" value={selectedTower.role} />
                <Metric
                  label="Available"
                  value={selectedTower.available ? "Yes" : "No"}
                />
                <Metric
                  label="Fans running"
                  value={`${
                    selectedTower.fans.filter((fan) => fan.status === "running")
                      .length
                  } / 5`}
                />
                <Metric
                  label="Heat rejection"
                  value={`${selectedTower.currentHeatRejectionKw.toFixed(1)} kW`}
                />
                <Metric
                  label="Entering water"
                  value={`${selectedTower.enteringWaterTemperatureC.toFixed(1)}°C`}
                />
                <Metric
                  label="Leaving water"
                  value={`${selectedTower.leavingWaterTemperatureC.toFixed(1)}°C`}
                />
                <Metric
                  label="Approach"
                  value={`${selectedTower.approachTemperatureC.toFixed(1)}°C`}
                />
                <Metric
                  label="Runtime"
                  value={formatRuntime(selectedTower.runtimeSeconds)}
                />
              </div>
            </div>
          )}

          {selectedFan && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs tracking-[0.2em] text-emerald-400 uppercase">
                  Fan Diagnostic
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedFan.id}
                </h3>
                <div className="mt-3">
                  <StatusPill status={selectedFan.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Speed"
                  value={`${selectedFan.speedPercent.toFixed(0)}%`}
                />
                <Metric
                  label="Power"
                  value={`${selectedFan.powerKw.toFixed(2)} kW`}
                />
                <Metric
                  label="Measured current"
                  value={`${selectedFan.currentAmpere.toFixed(2)} A`}
                />
                <Metric
                  label="Rated current"
                  value={`${selectedFan.ratedAmpere.toFixed(2)} A`}
                />
                <Metric
                  label="Expected current"
                  value={`${selectedFan.expectedCurrentAmpere.toFixed(2)} A`}
                />
                <Metric
                  label="Normalized load"
                  value={`${selectedFan.currentLoadPercent.toFixed(1)}%`}
                />
                <Metric
                  label="Runtime"
                  value={formatRuntime(selectedFan.runtimeSeconds)}
                />
                <Metric
                  label="Energy"
                  value={`${selectedFan.totalEnergyKwh.toFixed(3)} kWh`}
                />
                <Metric
                  label="Estimated cost"
                  value={formatMmk(
                    selectedFan.totalEnergyKwh *
                      state.configuration.tariffMmkPerKwh,
                  )}
                />
                <Metric label="Starts" value={selectedFan.startCount} />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  Belt condition
                </p>
                <p className="mt-2 font-semibold text-white">
                  {selectedFan.beltCondition.replaceAll("-", " ")}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {selectedFan.diagnosticMessage}
                </p>
              </div>
            </div>
          )}

          {selectedStarter && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs tracking-[0.2em] text-violet-400 uppercase">
                  Star–Delta Starter
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {selectedStarter.id}
                </h3>
                <div className="mt-3">
                  <StatusPill status={selectedStarter.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Chiller"
                  value={selectedStarter.associatedChillerId}
                />
                <Metric
                  label="Main contactor"
                  value={selectedStarter.mainContactorOn ? "ON" : "OFF"}
                />
                <Metric
                  label="Star contactor"
                  value={selectedStarter.starContactorOn ? "ON" : "OFF"}
                />
                <Metric
                  label="Delta contactor"
                  value={selectedStarter.deltaContactorOn ? "ON" : "OFF"}
                />
                <Metric
                  label="Elapsed"
                  value={`${selectedStarter.sequenceElapsedSeconds.toFixed(1)} s`}
                />
                <Metric
                  label="Last step"
                  value={selectedStarter.lastSequenceStep}
                />
              </div>

              {selectedStarter.tripReason && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {selectedStarter.tripReason}
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
