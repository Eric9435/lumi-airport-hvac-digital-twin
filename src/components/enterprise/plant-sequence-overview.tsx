"use client";

import { useMemo } from "react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import {
  formatMmk,
  formatRuntime,
  Metric,
  StatusPill,
} from "@/components/enterprise/plant-ui-helpers";

export function PlantSequenceOverview() {
  const state = useEnterprisePlantStore();

  const runningTransformers = state.transformers.filter(
    (item) => item.status === "energized",
  ).length;

  const availableTransformers = state.transformers.filter(
    (item) =>
      item.incomingSupplyAvailable &&
      item.protectionHealthy &&
      !item.maintenanceLockout &&
      !item.overcurrentTrip &&
      !item.earthFaultTrip &&
      !item.overtemperatureTrip,
  ).length;

  const runningTowers = state.coolingTowers.filter(
    (tower) => tower.status === "running",
  ).length;

  const runningFans = state.coolingTowers.reduce(
    (total, tower) =>
      total + tower.fans.filter((fan) => fan.status === "running").length,
    0,
  );

  const deltaRunning = state.starters.filter(
    (starter) => starter.status === "delta-running",
  ).length;

  const groupedEquipment = useMemo(
    () =>
      state.groups.map((group) => ({
        group,
        transformer: state.transformers.find(
          (item) => item.id === group.transformerId,
        ),
        primaryPump: state.primaryPumps.find(
          (item) => item.id === group.primaryPumpId,
        ),
        condenserPump: state.condenserPumps.find(
          (item) => item.id === group.condenserPumpId,
        ),
        starter: state.starters.find((item) => item.id === group.starterId),
      })),
    [
      state.groups,
      state.transformers,
      state.primaryPumps,
      state.condenserPumps,
      state.starters,
    ],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-400 uppercase">
              Automatic Central Plant
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Plant Sequence Overview
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {state.currentSequenceMessage}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              status={state.automaticControlEnabled ? "automatic" : "manual"}
            />
            <StatusPill status={state.sequenceState} />
            <StatusPill status={state.coolingTowerRedundancyStatus} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Metric
            label="Cooling demand"
            value={`${state.coolingDemandPercent.toFixed(1)}%`}
          />
          <Metric
            label="Predicted load"
            value={`${state.predictedCoolingLoadKw.toFixed(2)} kW`}
          />
          <Metric
            label="Required chillers"
            value={`${state.requiredChillerCount} / 4`}
          />
          <Metric label="Delta running" value={`${deltaRunning} / 4`} />
          <Metric
            label="Transformers"
            value={`${runningTransformers} running / ${availableTransformers} available`}
          />
          <Metric label="Cooling towers" value={`${runningTowers} / 4`} />
          <Metric label="CT fans" value={`${runningFans} / 20`} />
          <Metric
            label="Plant power"
            value={`${state.totalPlantPowerKw.toFixed(2)} kW`}
          />
          <Metric
            label="Today energy"
            value={`${state.todayPlantEnergyKwh.toFixed(3)} kWh`}
          />
          <Metric
            label="Today cost"
            value={formatMmk(state.todayElectricityCostMmk)}
          />
          <Metric
            label="Plant runtime"
            value={formatRuntime(state.plantRuntimeSeconds)}
          />
          <Metric
            label="Tariff"
            value={`${state.configuration.tariffMmkPerKwh} MMK/kWh`}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {groupedEquipment.map(
          ({ group, transformer, primaryPump, condenserPump, starter }) => (
            <article
              key={group.groupId}
              className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
                    {group.groupId}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {group.transformerId} → {group.chillerId}
                  </h3>
                </div>
                <StatusPill status={group.status} />
              </div>

              <div className="mt-5 space-y-2">
                {[
                  {
                    name: transformer?.id ?? group.transformerId,
                    detail: transformer
                      ? `${transformer.primaryVoltageKv.toFixed(1)} kV / ${transformer.secondaryVoltageV.toFixed(0)} V`
                      : "Missing",
                    status: transformer?.status ?? "unavailable",
                  },
                  {
                    name: "Incoming breaker",
                    detail: transformer?.incomingBreakerClosed
                      ? "Closed"
                      : "Open",
                    status: transformer?.incomingBreakerClosed
                      ? "running"
                      : "stopped",
                  },
                  {
                    name: "LV breaker / MCC",
                    detail: transformer?.lvBreakerClosed
                      ? "Supply healthy"
                      : "Supply isolated",
                    status: transformer?.lvBreakerClosed
                      ? "running"
                      : "stopped",
                  },
                  {
                    name: primaryPump?.id ?? group.primaryPumpId,
                    detail: primaryPump
                      ? `${primaryPump.flowM3h.toFixed(1)} m³/h`
                      : "Missing",
                    status: primaryPump?.status ?? "unavailable",
                  },
                  {
                    name: "Evaporator flow",
                    detail: primaryPump?.flowProven ? "Proven" : "Not proven",
                    status: primaryPump?.flowProven ? "running" : "stopped",
                  },
                  {
                    name: condenserPump?.id ?? group.condenserPumpId,
                    detail: condenserPump
                      ? `${condenserPump.flowM3h.toFixed(1)} m³/h`
                      : "Missing",
                    status: condenserPump?.status ?? "unavailable",
                  },
                  {
                    name: "Condenser flow",
                    detail: condenserPump?.flowProven ? "Proven" : "Not proven",
                    status: condenserPump?.flowProven ? "running" : "stopped",
                  },
                  {
                    name: starter?.id ?? group.starterId,
                    detail: starter?.lastSequenceStep ?? "Missing",
                    status: starter?.status ?? "unavailable",
                  },
                  {
                    name: group.chillerId,
                    detail:
                      starter?.status === "delta-running"
                        ? "Compressor available and running"
                        : "Waiting for Delta proof",
                    status:
                      starter?.status === "delta-running"
                        ? "running"
                        : group.status,
                  },
                ].map((step, index) => (
                  <div
                    key={`${group.groupId}-${step.name}`}
                    className="relative flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    {index < 8 && (
                      <span className="absolute -bottom-3 left-7 h-3 w-px bg-slate-700" />
                    )}

                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {step.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {step.detail}
                      </p>
                    </div>
                    <StatusPill status={step.status} />
                  </div>
                ))}
              </div>

              {group.failedStep && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  Failed step: {group.failedStep}
                </div>
              )}
            </article>
          ),
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div>
          <h3 className="text-xl font-semibold text-white">
            Common Cooling-Tower Pool
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Four towers share the condenser-water header. Any healthy tower can
            support any active chiller group.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {state.coolingTowers.map((tower) => {
            const runningFans = tower.fans.filter(
              (fan) => fan.status === "running",
            ).length;

            const powerKw = tower.fans.reduce(
              (total, fan) => total + fan.powerKw,
              0,
            );

            return (
              <div
                key={tower.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{tower.id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Preferred: {tower.preferredChillerId}
                    </p>
                  </div>
                  <StatusPill status={tower.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Metric
                    label="Role"
                    value={tower.role.replaceAll("-", " ")}
                  />
                  <Metric label="Fans" value={`${runningFans} / 5`} />
                  <Metric label="Power" value={`${powerKw.toFixed(2)} kW`} />
                  <Metric
                    label="Heat rejection"
                    value={`${tower.currentHeatRejectionKw.toFixed(1)} kW`}
                  />
                  <Metric
                    label="Leaving water"
                    value={`${tower.leavingWaterTemperatureC.toFixed(1)}°C`}
                  />
                  <Metric
                    label="Runtime"
                    value={formatRuntime(tower.runtimeSeconds)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="text-xl font-semibold text-white">
          Live Sequence Event Log
        </h3>

        <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
          {state.sequenceEvents.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
              No sequence changes have been recorded yet.
            </p>
          ) : (
            [...state.sequenceEvents].reverse().map((event) => (
              <div
                key={event.id}
                className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:grid-cols-[180px_150px_1fr]"
              >
                <p className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-cyan-300">
                  {event.equipmentId}
                </p>
                <p className="text-sm text-slate-300">{event.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
