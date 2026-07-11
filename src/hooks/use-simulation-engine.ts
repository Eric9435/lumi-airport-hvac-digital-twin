"use client";

import { useEffect } from "react";

import { runSimulationTick } from "@/lib/simulation/tick-engine";

import { useSimulationStore } from "@/store/simulation-store";

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

export function useSimulationEngine() {
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useSimulationStore.getState();

      if (!store.simulationRunning) {
        return;
      }

      const intervalSeconds = Math.max(0.1, store.simulationSpeed);

      const result = runSimulationTick(extractPlantState(), intervalSeconds);

      store.applySimulationTick(
        result.state,
        result.energySample,
        result.alarms,
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
}
