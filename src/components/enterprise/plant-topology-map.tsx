"use client";

import {
  Activity,
  Fan,
  Gauge,
  Snowflake,
  Thermometer,
  Waves,
  Zap,
} from "lucide-react";

import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { useSensorReplayStore } from "@/store/sensor-replay-store";
import { useSimulationStore } from "@/store/simulation-store";

function statusClass(status: string): string {
  switch (status) {
    case "running":
    case "energized":
    case "delta-running":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";

    case "starting":
    case "warning":
    case "standby":
      return "border-amber-500/50 bg-amber-500/10 text-amber-300";

    case "alarm":
    case "fault":
    case "trip":
    case "tripped":
      return "border-red-500/50 bg-red-500/10 text-red-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

function statusDotClass(status: string): string {
  switch (status) {
    case "running":
    case "energized":
    case "delta-running":
      return "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]";

    case "starting":
    case "warning":
    case "standby":
      return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]";

    case "alarm":
    case "fault":
    case "trip":
    case "tripped":
      return "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]";

    default:
      return "bg-slate-600";
  }
}

function Pipe({
  active,
  type,
  vertical = false,
}: {
  active: boolean;
  type: "chw-supply" | "chw-return" | "cw";
  vertical?: boolean;
}) {
  const color =
    type === "chw-supply"
      ? "bg-blue-500"
      : type === "chw-return"
        ? "bg-cyan-300"
        : "bg-emerald-500";

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-slate-800 ${
        vertical ? "h-10 w-1" : "h-1 w-full"
      }`}
    >
      <div
        className={`absolute inset-0 ${color} ${
          active ? "opacity-100" : "opacity-20"
        }`}
      />

      {active && (
        <span
          className={`absolute rounded-full bg-white shadow-[0_0_10px_white] ${
            vertical
              ? "left-[-2px] h-2 w-2 animate-[flowVertical_1.3s_linear_infinite]"
              : "top-[-2px] h-2 w-2 animate-[flowHorizontal_1.6s_linear_infinite]"
          }`}
        />
      )}
    </div>
  );
}

function EquipmentStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(
        status,
      )}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
      <p className="text-[9px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
    </div>
  );
}

export function PlantTopologyMap() {
  const enterprise = useEnterprisePlantStore();
  const simulation = useSimulationStore();
  const replay = useSensorReplayStore();

  const currentRow = replay.rows[replay.currentIndex];

  const runningChillers = simulation.chillers.filter(
    (chiller) => chiller.status === "running",
  ).length;

  const activeAhus = simulation.ahus.filter(
    (ahu) => ahu.status === "running",
  ).length;

  const chilledWaterActive = runningChillers > 0;

  const condenserWaterActive = enterprise.condenserPumps.some(
    (pump) => pump.flowProven,
  );

  const averageZoneTemperature =
    simulation.ahus.length > 0
      ? simulation.ahus.reduce((total, ahu) => total + ahu.zoneTempC, 0) /
        simulation.ahus.length
      : 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#030b18] shadow-2xl shadow-cyan-950/20">
      <style>{`
        @keyframes flowHorizontal {
          from { left: -8px; }
          to { left: calc(100% + 8px); }
        }

        @keyframes flowVertical {
          from { top: -8px; }
          to { top: calc(100% + 8px); }
        }
      `}</style>

      <header className="border-b border-slate-800 bg-slate-950/90 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-400 uppercase">
              LUMI Industrial Digital Twin
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-white">
              Airport HVAC Plant Topology
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Live chilled-water, condenser-water and AHU system visualization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EquipmentStatus
              status={replay.status === "playing" ? "running" : replay.status}
            />

            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              CSV {replay.currentIndex + 1} / {Math.max(1, replay.rows.length)}
            </span>

            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              {simulation.totalPowerKw.toFixed(2)} kW
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-w-[1280px] grid-cols-[220px_1fr_250px]">
        <aside className="border-r border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Plant Overview
          </p>

          <div className="mt-4 space-y-3">
            <Metric
              label="Plant Power"
              value={`${simulation.totalPowerKw.toFixed(2)} kW`}
            />

            <Metric
              label="Energy"
              value={`${simulation.totalEnergyKwh.toFixed(2)} kWh`}
            />

            <Metric
              label="Running Chillers"
              value={`${runningChillers} / ${simulation.chillers.length}`}
            />

            <Metric
              label="Active AHUs"
              value={`${activeAhus} / ${simulation.ahus.length}`}
            />

            <Metric
              label="Passengers"
              value={simulation.expectedPassengers.toLocaleString()}
            />

            <Metric
              label="Average Zone"
              value={`${averageZoneTemperature.toFixed(1)}°C`}
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">Flow Legend</p>

            <div className="mt-3 space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1 w-8 rounded-full bg-blue-500" />
                CHW Supply
              </div>

              <div className="flex items-center gap-2">
                <span className="h-1 w-8 rounded-full bg-cyan-300" />
                CHW Return
              </div>

              <div className="flex items-center gap-2">
                <span className="h-1 w-8 rounded-full bg-emerald-500" />
                Condenser Water
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-5 overflow-x-auto p-5">
          <section>
            <div className="mb-3 flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-emerald-500/30" />
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-300 uppercase">
                Cooling Towers
              </p>
              <div className="h-px flex-1 bg-emerald-500/30" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {enterprise.coolingTowers.map((tower) => (
                <article
                  key={tower.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{tower.id}</p>
                      <p className="text-[10px] text-slate-500">{tower.role}</p>
                    </div>

                    <EquipmentStatus status={tower.status} />
                  </div>

                  <div className="mt-3 flex justify-center">
                    <div className="relative rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <Fan
                        className={`h-7 w-7 ${
                          tower.status === "running"
                            ? "animate-spin text-emerald-300"
                            : "text-slate-600"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric
                      label="Leaving Water"
                      value={`${tower.leavingWaterTemperatureC.toFixed(1)}°C`}
                    />

                    <Metric
                      label="Heat Rejection"
                      value={`${tower.currentHeatRejectionKw.toFixed(1)} kW`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <Pipe active={condenserWaterActive} type="cw" />

          <section>
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-emerald-300 uppercase">
              Condenser Water Pumps
            </p>

            <div className="grid grid-cols-4 gap-3">
              {enterprise.condenserPumps.map((pump) => (
                <article
                  key={pump.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center"
                >
                  <Waves
                    className={`mx-auto h-7 w-7 ${
                      pump.status === "running"
                        ? "animate-pulse text-emerald-300"
                        : "text-slate-600"
                    }`}
                  />

                  <p className="mt-2 font-semibold text-white">{pump.id}</p>

                  <div className="mt-2">
                    <EquipmentStatus status={pump.status} />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {pump.flowProven ? "Flow proven" : "No flow"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <Pipe active={condenserWaterActive} type="cw" />

          <section>
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-blue-300 uppercase">
              Water-Cooled Chillers
            </p>

            <div className="grid grid-cols-4 gap-3">
              {simulation.chillers.map((chiller, index) => {
                const starter = enterprise.starters[index];

                return (
                  <article
                    key={chiller.id}
                    className={`rounded-xl border p-4 ${
                      chiller.status === "running"
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{chiller.id}</p>
                        <p className="text-[10px] text-slate-500">
                          Water-cooled chiller
                        </p>
                      </div>

                      <EquipmentStatus status={chiller.status} />
                    </div>

                    <div className="my-3 flex justify-center">
                      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                        <Snowflake
                          className={`h-8 w-8 ${
                            chiller.status === "running"
                              ? "animate-pulse text-cyan-300"
                              : "text-slate-600"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Metric
                        label="Load"
                        value={`${chiller.loadPercent.toFixed(1)}%`}
                      />

                      <Metric
                        label="Power"
                        value={`${chiller.powerKw.toFixed(2)} kW`}
                      />

                      <Metric
                        label="CHWS"
                        value={`${chiller.chilledWaterSupplyTempC.toFixed(
                          1,
                        )}°C`}
                      />

                      <Metric
                        label="Flow"
                        value={`${chiller.chilledWaterFlowM3h.toFixed(1)} m³/h`}
                      />
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-2 text-center">
                      <p className="text-[9px] text-slate-500 uppercase">
                        Starter
                      </p>

                      <p className="mt-1 text-xs font-semibold text-white">
                        {starter?.id ?? "Unavailable"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <Pipe active={chilledWaterActive} type="chw-supply" />

          <section>
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-blue-300 uppercase">
              Primary Chilled-Water Pumps
            </p>

            <div className="grid grid-cols-4 gap-3">
              {enterprise.primaryPumps.map((pump) => (
                <article
                  key={pump.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center"
                >
                  <Waves
                    className={`mx-auto h-7 w-7 ${
                      pump.status === "running"
                        ? "animate-pulse text-blue-300"
                        : "text-slate-600"
                    }`}
                  />

                  <p className="mt-2 font-semibold text-white">{pump.id}</p>

                  <div className="mt-2">
                    <EquipmentStatus status={pump.status} />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {pump.flowProven ? "Flow proven" : "No flow"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="rounded-full border border-blue-500/40 bg-blue-500/10 px-5 py-2 text-center text-xs font-semibold text-blue-200">
            Chilled-Water Supply Header ·{" "}
            {currentRow
              ? `${currentRow.chwSupplyTempC.toFixed(1)}°C`
              : "No CSV data"}
          </div>

          <Pipe active={chilledWaterActive} type="chw-supply" />

          <section>
            <p className="mb-3 text-center text-xs font-semibold tracking-[0.18em] text-cyan-300 uppercase">
              Airport AHU Zones
            </p>

            <div className="grid grid-cols-6 gap-2">
              {simulation.ahus.map((ahu) => (
                <article
                  key={ahu.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{ahu.id}</p>

                    <span
                      className={`h-2 w-2 rounded-full ${statusDotClass(
                        ahu.status,
                      )}`}
                    />
                  </div>

                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    {ahu.name}
                  </p>

                  <div className="my-3 flex justify-center">
                    <Fan
                      className={`h-8 w-8 ${
                        ahu.status === "running"
                          ? "animate-spin text-cyan-300"
                          : "text-slate-600"
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Metric
                      label="Zone"
                      value={`${ahu.zoneTempC.toFixed(1)}°C`}
                    />

                    <Metric
                      label="Setpoint"
                      value={`${ahu.setpointC.toFixed(1)}°C`}
                    />

                    <Metric
                      label="Airflow"
                      value={`${ahu.airflowCmh.toLocaleString()} CMH`}
                    />

                    <Metric
                      label="Fan Speed"
                      value={`${ahu.fanSpeedPercent.toFixed(0)}%`}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <Pipe active={chilledWaterActive} type="chw-return" />

          <div className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-5 py-2 text-center text-xs font-semibold text-cyan-200">
            Chilled-Water Return Header ·{" "}
            {currentRow
              ? `${currentRow.chwReturnTempC.toFixed(1)}°C`
              : "No CSV data"}
          </div>
        </main>

        <aside className="border-l border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Plant Information
          </p>

          <div className="mt-4 space-y-3">
            <Metric
              label="CHW Supply"
              value={
                currentRow ? `${currentRow.chwSupplyTempC.toFixed(1)}°C` : "—"
              }
            />

            <Metric
              label="CHW Return"
              value={
                currentRow ? `${currentRow.chwReturnTempC.toFixed(1)}°C` : "—"
              }
            />

            <Metric
              label="CHW ΔT"
              value={
                currentRow
                  ? `${(
                      currentRow.chwReturnTempC - currentRow.chwSupplyTempC
                    ).toFixed(1)}°C`
                  : "—"
              }
            />

            <Metric
              label="Outdoor DB"
              value={
                currentRow ? `${currentRow.outdoorDryBulbC.toFixed(1)}°C` : "—"
              }
            />

            <Metric
              label="Outdoor WB"
              value={
                currentRow ? `${currentRow.outdoorWetBulbC.toFixed(1)}°C` : "—"
              }
            />

            <Metric
              label="Effective Load"
              value={
                currentRow
                  ? `${currentRow.effectiveCoolingLoadKw.toFixed(1)} kW`
                  : "—"
              }
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">System Status</p>

            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">CSV Replay</span>
                <span className="font-semibold text-cyan-300">
                  {replay.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sequence</span>
                <span className="font-semibold text-white">
                  {enterprise.sequenceState}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active alarms</span>
                <span className="font-semibold text-white">
                  {simulation.activeAlarmCount}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-300" />
              <p className="text-xs font-semibold text-white">
                Electrical Supply
              </p>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              11 kV incoming supply feeds four transformer and MCC trains. Each
              train maps to its primary pump, condenser pump, starter and
              chiller.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <Gauge className="mx-auto h-5 w-5 text-cyan-300" />
              <p className="mt-2 text-[10px] text-slate-500">Cooling demand</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {currentRow
                  ? `${currentRow.ahuCoolingDemandPercent.toFixed(0)}%`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <Thermometer className="mx-auto h-5 w-5 text-amber-300" />
              <p className="mt-2 text-[10px] text-slate-500">Indoor average</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {averageZoneTemperature.toFixed(1)}°C
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <p className="text-xs font-semibold text-cyan-200">
                Live Digital Twin
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Equipment status, temperatures, airflow, power and pipe animation
              follow the existing CSV replay and plant runtime state.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
