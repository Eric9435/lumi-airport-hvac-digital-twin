"use client";

import { create } from "zustand";

import { initialEnterprisePlantState } from "@/lib/enterprise/initial-enterprise-state";
import {
  manualStartAll,
  manualStartChillerGroup,
  manualStartEquipment,
  manualStopAll,
  manualStopChillerGroup,
  manualStopEquipment,
} from "@/lib/enterprise/manual-plant-control";
import { runManualMeterTick } from "@/lib/enterprise/manual-meter-tick";
import { runEnterprisePlantTick } from "@/lib/enterprise/plant-controller";

import type {
  EnterprisePlantState,
  TransformerState,
} from "@/types/enterprise-plant";

interface EnterprisePlantActions {
  tick: (intervalSeconds?: number) => void;
  reset: () => void;

  setAutomaticControl: (enabled: boolean) => void;

  setOccupancy: (occupancy: number) => void;

  setOutdoorConditions: (
    dryBulbTemperatureC: number,
    wetBulbTemperatureC: number,
  ) => void;

  startChillerGroup: (chillerId: string) => void;

  stopChillerGroup: (chillerId: string) => void;

  startEquipment: (equipmentId: string) => void;

  stopEquipment: (equipmentId: string) => void;

  startAllEquipment: () => void;
  stopAllEquipment: () => void;

  startAllChillers: () => void;
  stopAllChillers: () => void;

  startAllTransformers: () => void;
  stopAllTransformers: () => void;

  startAllPrimaryPumps: () => void;
  stopAllPrimaryPumps: () => void;

  startAllSecondaryPumps: () => void;
  stopAllSecondaryPumps: () => void;

  startAllCondenserPumps: () => void;
  stopAllCondenserPumps: () => void;

  startAllCoolingTowers: () => void;
  stopAllCoolingTowers: () => void;

  startAllCoolingTowerFans: () => void;
  stopAllCoolingTowerFans: () => void;

  setTransformerMaintenance: (
    transformerId: string,
    maintenance: boolean,
  ) => void;

  tripTransformer: (
    transformerId: string,
    reason?: "overcurrent" | "earth-fault" | "overtemperature",
  ) => void;

  resetTransformerTrip: (transformerId: string) => void;
}

export type EnterprisePlantStore = EnterprisePlantState &
  EnterprisePlantActions;

const chillerIds = ["CH-01", "CH-02", "CH-03", "CH-04"];

const transformerIds = ["TR-01", "TR-02", "TR-03", "TR-04"];

const primaryPumpIds = ["PCHWP-01", "PCHWP-02", "PCHWP-03", "PCHWP-04"];

const secondaryPumpIds = ["SCHWP-01", "SCHWP-02"];

const condenserPumpIds = ["CWP-01", "CWP-02", "CWP-03", "CWP-04"];

const towerIds = ["CT-01", "CT-02", "CT-03", "CT-04"];

const fanIds = Array.from({ length: 4 }, (_, towerIndex) =>
  Array.from(
    { length: 5 },
    (_, fanIndex) =>
      `CT-${String(towerIndex + 1).padStart(2, "0")}-FAN-${String(
        fanIndex + 1,
      ).padStart(2, "0")}`,
  ),
).flat();

function applyMany(
  state: EnterprisePlantState,
  equipmentIds: string[],
  operation: "start" | "stop",
): EnterprisePlantState {
  return equipmentIds.reduce(
    (nextState, equipmentId) =>
      operation === "start"
        ? manualStartEquipment(nextState, equipmentId)
        : manualStopEquipment(nextState, equipmentId),
    state,
  );
}

export const useEnterprisePlantStore = create<EnterprisePlantStore>(
  (set, get) => ({
    ...initialEnterprisePlantState,

    tick: (intervalSeconds = 1) => {
      const state = get();

      const nextState = state.automaticControlEnabled
        ? runEnterprisePlantTick(state, intervalSeconds)
        : runManualMeterTick(state, intervalSeconds);

      set(nextState);
    },

    reset: () => {
      set({
        ...initialEnterprisePlantState,
        timestamp: new Date().toISOString(),
      });
    },

    setAutomaticControl: (enabled) => {
      set({
        automaticControlEnabled: enabled,
        sequenceState: enabled ? "calculating-demand" : "idle",
        currentSequenceMessage: enabled
          ? "Automatic plant control enabled. Demand-based sequencing is active."
          : "Manual plant control enabled. Automatic staging is suspended.",
        failedSequenceStep: null,
      });
    },

    setOccupancy: (occupancy) => {
      set({
        occupancy: Math.max(0, Math.round(occupancy)),
      });
    },

    setOutdoorConditions: (dryBulbTemperatureC, wetBulbTemperatureC) => {
      set({
        outdoorDryBulbTemperatureC: dryBulbTemperatureC,
        outdoorWetBulbTemperatureC: wetBulbTemperatureC,
      });
    },

    startChillerGroup: (chillerId) => {
      set(manualStartChillerGroup(get(), chillerId));
    },

    stopChillerGroup: (chillerId) => {
      set(manualStopChillerGroup(get(), chillerId));
    },

    startEquipment: (equipmentId) => {
      set(manualStartEquipment(get(), equipmentId));
    },

    stopEquipment: (equipmentId) => {
      set(manualStopEquipment(get(), equipmentId));
    },

    startAllEquipment: () => {
      set(manualStartAll(get()));
    },

    stopAllEquipment: () => {
      set(manualStopAll(get()));
    },

    startAllChillers: () => {
      set((storeState) => {
        const plantState: EnterprisePlantState = storeState;

        const nextPlantState = chillerIds.reduce<EnterprisePlantState>(
          (currentState, chillerId) =>
            manualStartChillerGroup(currentState, chillerId),
          plantState,
        );

        return nextPlantState;
      });
    },

    stopAllChillers: () => {
      set((storeState) => {
        const plantState: EnterprisePlantState = storeState;

        const nextPlantState = [...chillerIds]
          .reverse()
          .reduce<EnterprisePlantState>(
            (currentState, chillerId) =>
              manualStopChillerGroup(currentState, chillerId),
            plantState,
          );

        return nextPlantState;
      });
    },

    startAllTransformers: () => {
      set(applyMany(get(), transformerIds, "start"));
    },

    stopAllTransformers: () => {
      set(applyMany(get(), transformerIds, "stop"));
    },

    startAllPrimaryPumps: () => {
      set(applyMany(get(), primaryPumpIds, "start"));
    },

    stopAllPrimaryPumps: () => {
      set(applyMany(get(), primaryPumpIds, "stop"));
    },

    startAllSecondaryPumps: () => {
      set(applyMany(get(), secondaryPumpIds, "start"));
    },

    stopAllSecondaryPumps: () => {
      set(applyMany(get(), secondaryPumpIds, "stop"));
    },

    startAllCondenserPumps: () => {
      set(applyMany(get(), condenserPumpIds, "start"));
    },

    stopAllCondenserPumps: () => {
      set(applyMany(get(), condenserPumpIds, "stop"));
    },

    startAllCoolingTowers: () => {
      set(applyMany(get(), towerIds, "start"));
    },

    stopAllCoolingTowers: () => {
      set(applyMany(get(), towerIds, "stop"));
    },

    startAllCoolingTowerFans: () => {
      set(applyMany(get(), fanIds, "start"));
    },

    stopAllCoolingTowerFans: () => {
      set(applyMany(get(), fanIds, "stop"));
    },

    setTransformerMaintenance: (transformerId, maintenance) => {
      set((state) => ({
        transformers: state.transformers.map((transformer) =>
          transformer.id === transformerId
            ? {
                ...transformer,
                maintenanceLockout: maintenance,
                mode: maintenance ? "maintenance" : "automatic",
                status: maintenance ? "maintenance" : "off",
                incomingBreakerClosed: false,
                lvBreakerClosed: false,
                primaryVoltageKv: 0,
                secondaryVoltageV: 0,
                powerKw: 0,
              }
            : transformer,
        ),
      }));
    },

    tripTransformer: (transformerId, reason = "overcurrent") => {
      set((state) => ({
        transformers: state.transformers.map((transformer): TransformerState =>
          transformer.id === transformerId
            ? {
                ...transformer,
                status: "tripped",
                incomingBreakerClosed: false,
                lvBreakerClosed: false,
                primaryVoltageKv: 0,
                secondaryVoltageV: 0,
                powerKw: 0,
                activePowerKw: 0,
                apparentPowerKva: 0,
                overcurrentTrip: reason === "overcurrent",
                earthFaultTrip: reason === "earth-fault",
                overtemperatureTrip: reason === "overtemperature",
                alarmMessage: `Transformer tripped: ${reason}.`,
              }
            : transformer,
        ),
      }));
    },

    resetTransformerTrip: (transformerId) => {
      set((state) => ({
        transformers: state.transformers.map((transformer) =>
          transformer.id === transformerId
            ? {
                ...transformer,
                status: "off",
                overcurrentTrip: false,
                earthFaultTrip: false,
                overtemperatureTrip: false,
                protectionHealthy: true,
                alarmMessage: null,
              }
            : transformer,
        ),
      }));
    },
  }),
);
