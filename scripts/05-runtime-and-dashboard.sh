#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 5 FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json was not found." >&2
  exit 1
fi

if [[ ! -f src/types/hvac.ts ]]; then
  echo "ERROR: Part 4 HVAC domain model was not found." >&2
  exit 1
fi

echo "============================================================"
echo "PART 5 — RUNTIME STATE AND ANIMATED DASHBOARD"
echo "============================================================"

mkdir -p \
  src/store \
  src/lib/simulation \
  src/components/digital-twin \
  src/components/dashboard \
  src/components/lumi \
  src/components/ui \
  src/app/dashboard

echo "Creating runtime state helpers..."

cat > src/lib/simulation/state-helpers.ts <<'EOF'
import type {
  AhuState,
  ChillerState,
  PlantState,
} from "@/types/hvac";

export function calculateTotalPlantPower(
  state: PlantState,
): number {
  const chillerPower = state.chillers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const ahuPower = state.ahus.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const chilledWaterPumpPower =
    state.chilledWaterPumps.reduce(
      (total, equipment) => total + equipment.powerKw,
      0,
    );

  const condenserWaterPumpPower =
    state.condenserWaterPumps.reduce(
      (total, equipment) => total + equipment.powerKw,
      0,
    );

  const coolingTowerPower = state.coolingTowers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  return Number(
    (
      chillerPower +
      ahuPower +
      chilledWaterPumpPower +
      condenserWaterPumpPower +
      coolingTowerPower
    ).toFixed(2),
  );
}

export function startChillerState(
  chiller: ChillerState,
): ChillerState {
  if (chiller.status === "running") {
    return chiller;
  }

  return {
    ...chiller,
    status: "running",
    mode: "manual",
    loadPercent: 65,
    powerKw: Number(
      (chiller.ratedPowerKw * 0.65).toFixed(2),
    ),
    energyKwh: chiller.energyKwh,
    chilledWaterFlowM3h: 18,
    condenserWaterFlowM3h: 22,
    condenserWaterLeavingTempC: 34,
    cop: 4.8,
    compressorRunning: true,
    startCount: chiller.startCount + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function stopChillerState(
  chiller: ChillerState,
): ChillerState {
  if (chiller.status !== "running") {
    return chiller;
  }

  return {
    ...chiller,
    status: "standby",
    mode: "manual",
    loadPercent: 0,
    powerKw: 0,
    chilledWaterFlowM3h: 0,
    condenserWaterFlowM3h: 0,
    condenserWaterLeavingTempC:
      chiller.condenserWaterEnteringTempC,
    cop: 0,
    compressorRunning: false,
    lastUpdated: new Date().toISOString(),
  };
}

export function setAhuFanSpeedState(
  ahu: AhuState,
  requestedSpeed: number,
): AhuState {
  const fanSpeedPercent = Math.min(
    100,
    Math.max(0, requestedSpeed),
  );

  const airflowRatio = fanSpeedPercent / 100;

  const currentDesignPower =
    ahu.fanSpeedPercent > 0
      ? ahu.powerKw /
        Math.pow(ahu.fanSpeedPercent / 100, 3)
      : 8;

  return {
    ...ahu,
    status:
      fanSpeedPercent > 0 ? "running" : "stopped",
    mode: "manual",
    fanSpeedPercent,
    airflowCmh: Math.round(
      ahu.designAirflowCmh * airflowRatio,
    ),
    powerKw: Number(
      (
        currentDesignPower *
        Math.pow(airflowRatio, 3)
      ).toFixed(2),
    ),
    lastUpdated: new Date().toISOString(),
  };
}

export function setAhuSetpointState(
  ahu: AhuState,
  requestedSetpoint: number,
): AhuState {
  return {
    ...ahu,
    mode: "manual",
    setpointC: Math.min(
      30,
      Math.max(16, requestedSetpoint),
    ),
    lastUpdated: new Date().toISOString(),
  };
}
EOF

echo "Creating Zustand simulation store..."

cat > src/store/simulation-store.ts <<'EOF'
"use client";

import { create } from "zustand";

import { initialPlantState } from "@/lib/simulation/initial-state";
import {
  calculateTotalPlantPower,
  setAhuFanSpeedState,
  setAhuSetpointState,
  startChillerState,
  stopChillerState,
} from "@/lib/simulation/state-helpers";

import type {
  LumiCommand,
  PlantState,
} from "@/types/hvac";

export interface CommandExecutionResult {
  success: boolean;
  message: string;
}

interface SimulationActions {
  hydrate: (state: PlantState) => void;
  resetSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;

  startChiller: (
    equipmentId: string,
  ) => CommandExecutionResult;

  stopChiller: (
    equipmentId: string,
  ) => CommandExecutionResult;

  startAhu: (
    equipmentId: string,
  ) => CommandExecutionResult;

  stopAhu: (
    equipmentId: string,
  ) => CommandExecutionResult;

  setAhuFanSpeed: (
    equipmentId: string,
    value: number,
  ) => CommandExecutionResult;

  setAhuSetpoint: (
    equipmentId: string,
    value: number,
  ) => CommandExecutionResult;

  executeCommand: (
    command: LumiCommand,
  ) => CommandExecutionResult;
}

export type SimulationStore =
  PlantState & SimulationActions;

function withUpdatedPower(
  state: PlantState,
): PlantState {
  return {
    ...state,
    timestamp: new Date().toISOString(),
    totalPowerKw: calculateTotalPlantPower(state),
  };
}

export const useSimulationStore =
  create<SimulationStore>((set, get) => ({
    ...initialPlantState,

    hydrate: (state) => {
      set(withUpdatedPower(state));
    },

    resetSimulation: () => {
      set({
        ...initialPlantState,
        timestamp: new Date().toISOString(),
      });
    },

    pauseSimulation: () => {
      set({
        simulationRunning: false,
        timestamp: new Date().toISOString(),
      });
    },

    resumeSimulation: () => {
      set({
        simulationRunning: true,
        timestamp: new Date().toISOString(),
      });
    },

    startChiller: (equipmentId) => {
      const state = get();

      const target = state.chillers.find(
        (chiller) => chiller.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      if (target.status === "running") {
        return {
          success: true,
          message: `${equipmentId} is already running.`,
        };
      }

      const nextState: PlantState = {
        ...state,
        chillers: state.chillers.map((chiller) =>
          chiller.id === equipmentId
            ? startChillerState(chiller)
            : chiller,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message:
          `${equipmentId} started successfully in virtual simulation mode.`,
      };
    },

    stopChiller: (equipmentId) => {
      const state = get();

      const runningChillers = state.chillers.filter(
        (chiller) => chiller.status === "running",
      );

      const target = state.chillers.find(
        (chiller) => chiller.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      if (target.status !== "running") {
        return {
          success: true,
          message: `${equipmentId} is already stopped or on standby.`,
        };
      }

      if (runningChillers.length <= 1) {
        return {
          success: false,
          message:
            "At least one chiller must remain running. Stop command rejected by the virtual safety interlock.",
        };
      }

      const nextState: PlantState = {
        ...state,
        chillers: state.chillers.map((chiller) =>
          chiller.id === equipmentId
            ? stopChillerState(chiller)
            : chiller,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message:
          `${equipmentId} stopped successfully and changed to standby mode.`,
      };
    },

    startAhu: (equipmentId) => {
      const state = get();

      const target = state.ahus.find(
        (ahu) => ahu.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      const requestedSpeed =
        target.fanSpeedPercent > 0
          ? target.fanSpeedPercent
          : 60;

      const nextState: PlantState = {
        ...state,
        ahus: state.ahus.map((ahu) =>
          ahu.id === equipmentId
            ? setAhuFanSpeedState(
                ahu,
                requestedSpeed,
              )
            : ahu,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message:
          `${equipmentId} started at ${requestedSpeed}% fan speed.`,
      };
    },

    stopAhu: (equipmentId) => {
      const state = get();

      const target = state.ahus.find(
        (ahu) => ahu.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      const nextState: PlantState = {
        ...state,
        ahus: state.ahus.map((ahu) =>
          ahu.id === equipmentId
            ? setAhuFanSpeedState(ahu, 0)
            : ahu,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message: `${equipmentId} stopped successfully.`,
      };
    },

    setAhuFanSpeed: (
      equipmentId,
      value,
    ) => {
      const state = get();

      const target = state.ahus.find(
        (ahu) => ahu.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      if (value < 0 || value > 100) {
        return {
          success: false,
          message:
            "Fan speed must be between 0% and 100%.",
        };
      }

      const nextState: PlantState = {
        ...state,
        ahus: state.ahus.map((ahu) =>
          ahu.id === equipmentId
            ? setAhuFanSpeedState(ahu, value)
            : ahu,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message:
          `${equipmentId} fan speed changed to ${value}%.`,
      };
    },

    setAhuSetpoint: (
      equipmentId,
      value,
    ) => {
      const state = get();

      const target = state.ahus.find(
        (ahu) => ahu.id === equipmentId,
      );

      if (!target) {
        return {
          success: false,
          message: `${equipmentId} was not found.`,
        };
      }

      if (value < 16 || value > 30) {
        return {
          success: false,
          message:
            "Temperature setpoint must be between 16°C and 30°C.",
        };
      }

      const nextState: PlantState = {
        ...state,
        ahus: state.ahus.map((ahu) =>
          ahu.id === equipmentId
            ? setAhuSetpointState(ahu, value)
            : ahu,
        ),
      };

      set(withUpdatedPower(nextState));

      return {
        success: true,
        message:
          `${equipmentId} temperature setpoint changed to ${value}°C.`,
      };
    },

    executeCommand: (command) => {
      const actions = get();

      switch (command.action) {
        case "START_CHILLER":
          return actions.startChiller(
            command.equipmentId,
          );

        case "STOP_CHILLER":
          return actions.stopChiller(
            command.equipmentId,
          );

        case "START_AHU":
          return actions.startAhu(
            command.equipmentId,
          );

        case "STOP_AHU":
          return actions.stopAhu(
            command.equipmentId,
          );

        case "SET_AHU_FAN_SPEED":
          return actions.setAhuFanSpeed(
            command.equipmentId,
            command.value,
          );

        case "SET_AHU_SETPOINT":
          return actions.setAhuSetpoint(
            command.equipmentId,
            command.value,
          );

        case "SHOW_PLANT_STATUS": {
          const state = get();

          const runningChillers =
            state.chillers.filter(
              (chiller) =>
                chiller.status === "running",
            ).length;

          return {
            success: true,
            message:
              `Plant operating normally. ` +
              `${runningChillers} chillers are running, ` +
              `${state.ahus.filter((ahu) => ahu.status === "running").length} AHUs are running, ` +
              `and total plant power is ${state.totalPowerKw} kW.`,
          };
        }

        case "UNKNOWN":
          return {
            success: false,
            message:
              "LUMI could not understand that command.",
          };
      }
    },
  }));
EOF

echo "Creating animated fan component..."

cat > src/components/digital-twin/animated-fan.tsx <<'EOF'
"use client";

import { motion } from "framer-motion";
import { Fan } from "lucide-react";

interface AnimatedFanProps {
  running: boolean;
  speedPercent: number;
  size?: number;
}

export function AnimatedFan({
  running,
  speedPercent,
  size = 68,
}: AnimatedFanProps) {
  const normalizedSpeed = Math.min(
    100,
    Math.max(0, speedPercent),
  );

  const rotationDuration = running
    ? Math.max(
        0.25,
        2.4 - normalizedSpeed * 0.019,
      )
    : 0;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-700 bg-slate-950/70">
      <motion.div
        animate={
          running
            ? {
                rotate: 360,
              }
            : {
                rotate: 0,
              }
        }
        transition={
          running
            ? {
                duration: rotationDuration,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              }
            : {
                duration: 0.25,
              }
        }
      >
        <Fan
          size={size}
          className={
            running
              ? "text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.8)]"
              : "text-slate-600"
          }
        />
      </motion.div>

      <span className="absolute -bottom-6 text-xs font-medium text-slate-400">
        {normalizedSpeed}%
      </span>
    </div>
  );
}
EOF

echo "Creating reusable status badge..."

cat > src/components/ui/status-badge.tsx <<'EOF'
import type {
  EquipmentStatus,
} from "@/types/hvac";

interface StatusBadgeProps {
  status: EquipmentStatus;
}

const statusClasses: Record<
  EquipmentStatus,
  string
> = {
  running:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  standby:
    "border-amber-500/40 bg-amber-500/10 text-amber-300",
  stopped:
    "border-slate-600 bg-slate-800 text-slate-300",
  starting:
    "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  stopping:
    "border-orange-500/40 bg-orange-500/10 text-orange-300",
  warning:
    "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  alarm:
    "border-red-500/40 bg-red-500/10 text-red-300",
  maintenance:
    "border-violet-500/40 bg-violet-500/10 text-violet-300",
  offline:
    "border-slate-700 bg-slate-900 text-slate-500",
};

export function StatusBadge({
  status,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusClasses[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}
EOF

echo "Creating KPI card..."

cat > src/components/dashboard/kpi-card.tsx <<'EOF'
import type {
  LucideIcon,
} from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {title}
        </p>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
          <Icon
            size={18}
            className="text-cyan-300"
          />
        </div>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </article>
  );
}
EOF

echo "Creating chiller card..."

cat > src/components/chillers/chiller-card.tsx <<'EOF'
"use client";

import {
  CirclePower,
  Gauge,
  Snowflake,
  Waves,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useSimulationStore } from "@/store/simulation-store";

import type {
  ChillerState,
} from "@/types/hvac";

interface ChillerCardProps {
  chiller: ChillerState;
}

export function ChillerCard({
  chiller,
}: ChillerCardProps) {
  const startChiller = useSimulationStore(
    (state) => state.startChiller,
  );

  const stopChiller = useSimulationStore(
    (state) => state.stopChiller,
  );

  const running = chiller.status === "running";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            {chiller.id}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {chiller.name}
          </h3>
        </div>

        <StatusBadge status={chiller.status} />
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div
          className={[
            "flex h-24 w-24 items-center justify-center rounded-full border transition-all duration-300",
            running
              ? "border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
              : "border-slate-700 bg-slate-950",
          ].join(" ")}
        >
          <Snowflake
            size={48}
            className={
              running
                ? "animate-pulse text-cyan-300"
                : "text-slate-600"
            }
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Gauge size={14} />
            Load
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.loadPercent}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CirclePower size={14} />
            Power
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.powerKw} kW
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Snowflake size={14} />
            CHWS
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.chilledWaterSupplyTempC}°C
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Waves size={14} />
            Flow
          </div>
          <p className="mt-1 font-semibold text-white">
            {chiller.chilledWaterFlowM3h} m³/h
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={running}
          onClick={() => startChiller(chiller.id)}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>

        <button
          type="button"
          disabled={!running}
          onClick={() => stopChiller(chiller.id)}
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Stop
        </button>
      </div>
    </article>
  );
}
EOF

echo "Creating AHU card..."

cat > src/components/ahu/ahu-card.tsx <<'EOF'
"use client";

import {
  Activity,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";

import { AnimatedFan } from "@/components/digital-twin/animated-fan";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSimulationStore } from "@/store/simulation-store";

import type {
  AhuState,
} from "@/types/hvac";

interface AhuCardProps {
  ahu: AhuState;
}

export function AhuCard({
  ahu,
}: AhuCardProps) {
  const setAhuFanSpeed = useSimulationStore(
    (state) => state.setAhuFanSpeed,
  );

  const setAhuSetpoint = useSimulationStore(
    (state) => state.setAhuSetpoint,
  );

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            {ahu.id}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-white">
            {ahu.zoneName}
          </h3>
        </div>

        <StatusBadge status={ahu.status} />
      </div>

      <div className="mt-6 flex justify-center">
        <AnimatedFan
          running={ahu.status === "running"}
          speedPercent={ahu.fanSpeedPercent}
        />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Wind size={14} />
            Airflow
          </div>
          <p className="mt-1 font-semibold text-white">
            {ahu.airflowCmh.toLocaleString()} CMH
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Thermometer size={14} />
            Zone
          </div>
          <p className="mt-1 font-semibold text-white">
            {ahu.zoneTempC}°C
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity size={14} />
            Setpoint
          </div>
          <p className="mt-1 font-semibold text-white">
            {ahu.setpointC}°C
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Zap size={14} />
            Power
          </div>
          <p className="mt-1 font-semibold text-white">
            {ahu.powerKw} kW
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Fan speed</span>
          <span>{ahu.fanSpeedPercent}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={ahu.fanSpeedPercent}
          onChange={(event) =>
            setAhuFanSpeed(
              ahu.id,
              Number(event.target.value),
            )
          }
          className="mt-2 w-full accent-cyan-400"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label
          htmlFor={`${ahu.id}-setpoint`}
          className="text-xs text-slate-400"
        >
          Setpoint
        </label>

        <input
          id={`${ahu.id}-setpoint`}
          type="number"
          min="16"
          max="30"
          step="0.5"
          value={ahu.setpointC}
          onChange={(event) =>
            setAhuSetpoint(
              ahu.id,
              Number(event.target.value),
            )
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
      </div>
    </article>
  );
}
EOF

echo "Creating LUMI command console..."

cat > src/components/lumi/lumi-command-console.tsx <<'EOF'
"use client";

import {
  Bot,
  Send,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import { parseLumiCommand } from "@/services/lumi-command.service";
import { useSimulationStore } from "@/store/simulation-store";

interface LumiMessage {
  id: string;
  role: "user" | "lumi";
  content: string;
  success?: boolean;
}

const initialMessages: LumiMessage[] = [
  {
    id: "welcome",
    role: "lumi",
    content:
      "LUMI industrial control interface is online. Try “Start CH-02”, “Set AHU-02 fan speed to 85%”, or “Show plant status”.",
    success: true,
  },
];

export function LumiCommandConsole() {
  const [input, setInput] = useState("");
  const [messages, setMessages] =
    useState<LumiMessage[]>(initialMessages);

  const executeCommand = useSimulationStore(
    (state) => state.executeCommand,
  );

  function submitCommand(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    const command = parseLumiCommand(trimmedInput);
    const result = executeCommand(command);

    const timestamp = Date.now();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmedInput,
      },
      {
        id: `lumi-${timestamp}`,
        role: "lumi",
        content: result.message,
        success: result.success,
      },
    ]);

    setInput("");
  }

  return (
    <section className="flex min-h-[440px] flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
      <header className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2">
          <Bot
            size={22}
            className="text-cyan-300"
          />
        </div>

        <div>
          <h2 className="font-semibold text-white">
            LUMI Command Center
          </h2>

          <p className="text-xs text-emerald-400">
            Virtual control interface online
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%]"
                : "mr-auto max-w-[90%]"
            }
          >
            <div
              className={[
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-cyan-500 text-slate-950"
                  : message.success === false
                    ? "border border-red-500/30 bg-red-500/10 text-red-200"
                    : "border border-slate-700 bg-slate-950 text-slate-200",
              ].join(" ")}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={submitCommand}
        className="border-t border-slate-800 p-4"
      >
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            placeholder="Type a LUMI command..."
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />

          <button
            type="submit"
            className="flex items-center justify-center rounded-xl bg-cyan-400 px-4 text-slate-950 transition hover:bg-cyan-300"
            aria-label="Send command"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
EOF

echo "Creating professional dashboard..."

cat > src/components/dashboard/plant-dashboard.tsx <<'EOF'
"use client";

import {
  Activity,
  AlertTriangle,
  Plane,
  Snowflake,
  Zap,
} from "lucide-react";

import { AhuCard } from "@/components/ahu/ahu-card";
import { ChillerCard } from "@/components/chillers/chiller-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LumiCommandConsole } from "@/components/lumi/lumi-command-console";
import { useSimulationStore } from "@/store/simulation-store";

export function PlantDashboard() {
  const totalPowerKw = useSimulationStore(
    (state) => state.totalPowerKw,
  );

  const activeAlarmCount = useSimulationStore(
    (state) => state.activeAlarmCount,
  );

  const expectedPassengers = useSimulationStore(
    (state) => state.expectedPassengers,
  );

  const chillers = useSimulationStore(
    (state) => state.chillers,
  );

  const ahus = useSimulationStore(
    (state) => state.ahus,
  );

  const simulationRunning = useSimulationStore(
    (state) => state.simulationRunning,
  );

  const pauseSimulation = useSimulationStore(
    (state) => state.pauseSimulation,
  );

  const resumeSimulation = useSimulationStore(
    (state) => state.resumeSimulation,
  );

  const resetSimulation = useSimulationStore(
    (state) => state.resetSimulation,
  );

  const runningChillers = chillers.filter(
    (chiller) => chiller.status === "running",
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-400">
              LUMI Industrial Twin
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Airport HVAC Digital Twin
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Virtual water-cooled chiller plant,
              flight-aware AHU operations and
              conversational industrial control.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                simulationRunning
                  ? pauseSimulation
                  : resumeSimulation
              }
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
            >
              {simulationRunning
                ? "Pause simulation"
                : "Resume simulation"}
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
                    Four virtual 11 kW
                    water-cooled chillers
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {chillers.map((chiller) => (
                  <ChillerCard
                    key={chiller.id}
                    chiller={chiller}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Airport AHU Zones
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Interactive fan speed and temperature
                  setpoint control
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {ahus.map((ahu) => (
                  <AhuCard
                    key={ahu.id}
                    ahu={ahu}
                  />
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
EOF

echo "Creating dashboard route..."

cat > src/app/dashboard/page.tsx <<'EOF'
import { PlantDashboard } from "@/components/dashboard/plant-dashboard";

export default function DashboardPage() {
  return <PlantDashboard />;
}
EOF

echo "Updating homepage..."

cat > src/app/page.tsx <<'EOF'
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
EOF

echo "Formatting Part 5 source files..."

npx prettier --write \
  src/lib/simulation/state-helpers.ts \
  src/store/simulation-store.ts \
  src/components/digital-twin/animated-fan.tsx \
  src/components/ui/status-badge.tsx \
  src/components/dashboard/kpi-card.tsx \
  src/components/chillers/chiller-card.tsx \
  src/components/ahu/ahu-card.tsx \
  src/components/lumi/lumi-command-console.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  src/app/dashboard/page.tsx \
  src/app/page.tsx

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Staging Part 5 changes..."

git add \
  scripts/05-runtime-and-dashboard.sh \
  src/lib/simulation/state-helpers.ts \
  src/store/simulation-store.ts \
  src/components/digital-twin/animated-fan.tsx \
  src/components/ui/status-badge.tsx \
  src/components/dashboard/kpi-card.tsx \
  src/components/chillers/chiller-card.tsx \
  src/components/ahu/ahu-card.tsx \
  src/components/lumi/lumi-command-console.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  src/app/dashboard/page.tsx \
  src/app/page.tsx

if git diff --cached --quiet; then
  echo "No new Part 5 changes to commit."
else
  git commit \
    -m "feat: add interactive HVAC runtime and animated dashboard"

  git push
fi

echo
echo "============================================================"
echo "PART 5 COMPLETED SUCCESSFULLY"
echo "Interactive digital-twin dashboard is ready"
echo "============================================================"
echo
echo "Run the application:"
echo "  npm run dev"
echo
echo "Open:"
echo "  http://localhost:3000/dashboard"
echo
echo "Test LUMI commands:"
echo "  Start CH-02"
echo "  Stop CH-02"
echo "  Set AHU-02 fan speed to 85%"
echo "  Set AHU-03 temperature to 22.5C"
echo "  Show plant status"
echo
