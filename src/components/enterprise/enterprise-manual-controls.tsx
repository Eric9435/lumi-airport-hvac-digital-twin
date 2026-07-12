"use client";

import { useMemo, useState } from "react";
import { Fan, Play, Power, Snowflake, Square, Waves, Zap } from "lucide-react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { StatusPill } from "@/components/enterprise/plant-ui-helpers";

interface EquipmentButtonProps {
  id: string;
  status: string;
  start: () => void;
  stop: () => void;
}

function EquipmentButton({ id, status, start, stop }: EquipmentButtonProps) {
  const running =
    status === "running" ||
    status === "energized" ||
    status === "delta-running";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{id}</p>
        <StatusPill status={status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" />
          Start
        </button>

        <button
          type="button"
          onClick={stop}
          disabled={!running && status !== "starting"}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      </div>
    </div>
  );
}

export function EnterpriseManualControls() {
  const state = useEnterprisePlantStore();

  const [activeTab, setActiveTab] = useState<
    "groups" | "transformers" | "pumps" | "towers" | "fans"
  >("groups");

  const runningEquipment = useMemo(() => {
    const runningTransformers = state.transformers.filter(
      (item) => item.status === "energized",
    ).length;

    const runningPumps = [
      ...state.primaryPumps,
      ...state.secondaryPumps,
      ...state.condenserPumps,
    ].filter((item) => item.status === "running").length;

    const runningFans = state.coolingTowers.reduce(
      (total, tower) =>
        total + tower.fans.filter((fan) => fan.status === "running").length,
      0,
    );

    return {
      transformers: runningTransformers,
      pumps: runningPumps,
      fans: runningFans,
    };
  }, [
    state.transformers,
    state.primaryPumps,
    state.secondaryPumps,
    state.condenserPumps,
    state.coolingTowers,
  ]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-violet-400 uppercase">
            Operator Control
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            Enterprise Manual Plant Controls
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Starting a chiller group automatically maps its transformer, primary
            pump, condenser pump, cooling-tower fans and Star–Delta starter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => state.setAutomaticControl(true)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              state.automaticControlEnabled
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            AUTO
          </button>

          <button
            type="button"
            onClick={() => state.setAutomaticControl(false)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              !state.automaticControlEnabled
                ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            MANUAL
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-500">Transformers running</p>
          <p className="mt-1 font-semibold text-white">
            {runningEquipment.transformers} / 4
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-500">Pumps running</p>
          <p className="mt-1 font-semibold text-white">
            {runningEquipment.pumps} / 10
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-500">CT fans running</p>
          <p className="mt-1 font-semibold text-white">
            {runningEquipment.fans} / 20
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={state.startAllEquipment}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          <Power className="h-4 w-4" />
          Start All Equipment
        </button>

        <button
          type="button"
          onClick={state.stopAllEquipment}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20"
        >
          <Square className="h-4 w-4" />
          Stop All Equipment
        </button>

        <button
          type="button"
          onClick={state.startAllChillers}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/20"
        >
          <Snowflake className="h-4 w-4" />
          Start All Chiller Groups
        </button>

        <button
          type="button"
          onClick={state.stopAllChillers}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
        >
          <Snowflake className="h-4 w-4" />
          Stop All Chiller Groups
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["groups", "Chiller Groups"],
          ["transformers", "Transformers"],
          ["pumps", "Pumps"],
          ["towers", "Cooling Towers"],
          ["fans", "20 CT Fans"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              activeTab === id
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === "groups" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {state.groups.map((group) => (
              <div
                key={group.groupId}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {group.chillerId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.transformerId} · {group.primaryPumpId} ·{" "}
                      {group.condenserPumpId}
                    </p>
                  </div>

                  <StatusPill status={group.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => state.startChillerGroup(group.chillerId)}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Start Group
                  </button>

                  <button
                    type="button"
                    onClick={() => state.stopChillerGroup(group.chillerId)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    Stop Group
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "transformers" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={state.startAllTransformers}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300"
              >
                Start All Transformers
              </button>
              <button
                type="button"
                onClick={state.stopAllTransformers}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
              >
                Stop All Transformers
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {state.transformers.map((transformer) => (
                <EquipmentButton
                  key={transformer.id}
                  id={transformer.id}
                  status={transformer.status}
                  start={() => state.startEquipment(transformer.id)}
                  stop={() => state.stopEquipment(transformer.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "pumps" && (
          <div className="space-y-6">
            {[
              {
                title: "Primary Chilled-Water Pumps",
                icon: Waves,
                equipment: state.primaryPumps,
                startAll: state.startAllPrimaryPumps,
                stopAll: state.stopAllPrimaryPumps,
              },
              {
                title: "Secondary Chilled-Water Pumps",
                icon: Waves,
                equipment: state.secondaryPumps,
                startAll: state.startAllSecondaryPumps,
                stopAll: state.stopAllSecondaryPumps,
              },
              {
                title: "Condenser-Water Pumps",
                icon: Waves,
                equipment: state.condenserPumps,
                startAll: state.startAllCondenserPumps,
                stopAll: state.stopAllCondenserPumps,
              },
            ].map((section) => (
              <div key={section.title}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-cyan-300" />
                    <h4 className="font-semibold text-white">
                      {section.title}
                    </h4>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={section.startAll}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
                    >
                      Start All
                    </button>
                    <button
                      type="button"
                      onClick={section.stopAll}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                    >
                      Stop All
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {section.equipment.map((pump) => (
                    <EquipmentButton
                      key={pump.id}
                      id={`${pump.id} · ${pump.dutyRole}`}
                      status={pump.status}
                      start={() => state.startEquipment(pump.id)}
                      stop={() => state.stopEquipment(pump.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "towers" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={state.startAllCoolingTowers}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
              >
                Start All Cooling Towers
              </button>
              <button
                type="button"
                onClick={state.stopAllCoolingTowers}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                Stop All Cooling Towers
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {state.coolingTowers.map((tower) => (
                <EquipmentButton
                  key={tower.id}
                  id={`${tower.id} · ${tower.role}`}
                  status={tower.status}
                  start={() => state.startEquipment(tower.id)}
                  stop={() => state.stopEquipment(tower.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "fans" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={state.startAllCoolingTowerFans}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
              >
                <Fan className="h-3.5 w-3.5" />
                Start All 20 Fans
              </button>

              <button
                type="button"
                onClick={state.stopAllCoolingTowerFans}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
              >
                <Fan className="h-3.5 w-3.5" />
                Stop All 20 Fans
              </button>
            </div>

            {state.coolingTowers.map((tower) => (
              <div key={tower.id}>
                <h4 className="mb-3 font-semibold text-white">
                  {tower.id} Fans
                </h4>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  {tower.fans.map((fan) => (
                    <EquipmentButton
                      key={fan.id}
                      id={fan.id}
                      status={fan.status}
                      start={() => state.startEquipment(fan.id)}
                      stop={() => state.stopEquipment(fan.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
