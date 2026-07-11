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

import type { ActiveAlarm, EnergySample } from "@/types/analytics";

import type { LumiCommand, PlantState } from "@/types/hvac";

export interface CommandExecutionResult {
  success: boolean;
  message: string;
}

interface SimulationAnalyticsState {
  energyHistory: EnergySample[];
  activeAlarms: ActiveAlarm[];
}

interface SimulationActions {
  hydrate: (state: PlantState) => void;

  resetSimulation: () => void;

  pauseSimulation: () => void;

  resumeSimulation: () => void;

  startChiller: (equipmentId: string) => CommandExecutionResult;

  stopChiller: (equipmentId: string) => CommandExecutionResult;

  startAhu: (equipmentId: string) => CommandExecutionResult;

  stopAhu: (equipmentId: string) => CommandExecutionResult;

  setAhuFanSpeed: (
    equipmentId: string,
    value: number,
  ) => CommandExecutionResult;

  setAhuSetpoint: (
    equipmentId: string,
    value: number,
  ) => CommandExecutionResult;

  executeCommand: (command: LumiCommand) => CommandExecutionResult;

  applySimulationTick: (
    state: PlantState,
    energySample: EnergySample,
    alarms: ActiveAlarm[],
  ) => void;

  acknowledgeAlarm: (alarmId: string) => void;

  clearEnergyHistory: () => void;
}

export type SimulationStore = PlantState &
  SimulationAnalyticsState &
  SimulationActions;

function withUpdatedPower(state: PlantState): PlantState {
  return {
    ...state,
    timestamp: new Date().toISOString(),
    totalPowerKw: calculateTotalPlantPower(state),
  };
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  ...initialPlantState,

  energyHistory: [],

  activeAlarms: [],

  hydrate: (state) => {
    set({
      ...withUpdatedPower(state),
      energyHistory: get().energyHistory,
      activeAlarms: get().activeAlarms,
    });
  },

  resetSimulation: () => {
    set({
      ...initialPlantState,
      timestamp: new Date().toISOString(),
      energyHistory: [],
      activeAlarms: [],
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

    const target = state.chillers.find((chiller) => chiller.id === equipmentId);

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
        chiller.id === equipmentId ? startChillerState(chiller) : chiller,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} started successfully in virtual simulation mode.`,
    };
  },

  stopChiller: (equipmentId) => {
    const state = get();

    const target = state.chillers.find((chiller) => chiller.id === equipmentId);

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

    const runningChillers = state.chillers.filter(
      (chiller) => chiller.status === "running",
    );

    if (runningChillers.length <= 1) {
      return {
        success: false,
        message:
          "At least one chiller must remain running. The virtual safety interlock rejected the command.",
      };
    }

    const nextState: PlantState = {
      ...state,

      chillers: state.chillers.map((chiller) =>
        chiller.id === equipmentId ? stopChillerState(chiller) : chiller,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} stopped successfully and changed to standby mode.`,
    };
  },

  startAhu: (equipmentId) => {
    const state = get();

    const target = state.ahus.find((ahu) => ahu.id === equipmentId);

    if (!target) {
      return {
        success: false,
        message: `${equipmentId} was not found.`,
      };
    }

    const requestedSpeed =
      target.fanSpeedPercent > 0 ? target.fanSpeedPercent : 60;

    const nextState: PlantState = {
      ...state,

      ahus: state.ahus.map((ahu) =>
        ahu.id === equipmentId ? setAhuFanSpeedState(ahu, requestedSpeed) : ahu,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} started at ${requestedSpeed}% fan speed.`,
    };
  },

  stopAhu: (equipmentId) => {
    const state = get();

    const target = state.ahus.find((ahu) => ahu.id === equipmentId);

    if (!target) {
      return {
        success: false,
        message: `${equipmentId} was not found.`,
      };
    }

    const nextState: PlantState = {
      ...state,

      ahus: state.ahus.map((ahu) =>
        ahu.id === equipmentId ? setAhuFanSpeedState(ahu, 0) : ahu,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} stopped successfully.`,
    };
  },

  setAhuFanSpeed: (equipmentId, value) => {
    const state = get();

    const target = state.ahus.find((ahu) => ahu.id === equipmentId);

    if (!target) {
      return {
        success: false,
        message: `${equipmentId} was not found.`,
      };
    }

    if (value < 0 || value > 100) {
      return {
        success: false,
        message: "Fan speed must be between 0% and 100%.",
      };
    }

    const nextState: PlantState = {
      ...state,

      ahus: state.ahus.map((ahu) =>
        ahu.id === equipmentId ? setAhuFanSpeedState(ahu, value) : ahu,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} fan speed changed to ${value}%.`,
    };
  },

  setAhuSetpoint: (equipmentId, value) => {
    const state = get();

    const target = state.ahus.find((ahu) => ahu.id === equipmentId);

    if (!target) {
      return {
        success: false,
        message: `${equipmentId} was not found.`,
      };
    }

    if (value < 16 || value > 30) {
      return {
        success: false,
        message: "Temperature setpoint must be between 16°C and 30°C.",
      };
    }

    const nextState: PlantState = {
      ...state,

      ahus: state.ahus.map((ahu) =>
        ahu.id === equipmentId ? setAhuSetpointState(ahu, value) : ahu,
      ),
    };

    set(withUpdatedPower(nextState));

    return {
      success: true,
      message: `${equipmentId} temperature setpoint changed to ${value}°C.`,
    };
  },

  applySimulationTick: (state, energySample, alarms) => {
    const current = get();

    const acknowledgedAlarmIds = new Set(
      current.activeAlarms
        .filter((alarm) => alarm.acknowledged)
        .map((alarm) => alarm.alarmId),
    );

    const activeAlarms = alarms.map((alarm) => ({
      ...alarm,

      acknowledged: acknowledgedAlarmIds.has(alarm.alarmId),
    }));

    set({
      ...state,

      activeAlarms,

      energyHistory: [...current.energyHistory, energySample].slice(-120),
    });
  },

  acknowledgeAlarm: (alarmId) => {
    set((state) => ({
      activeAlarms: state.activeAlarms.map((alarm) =>
        alarm.alarmId === alarmId
          ? {
              ...alarm,
              acknowledged: true,
            }
          : alarm,
      ),
    }));
  },

  clearEnergyHistory: () => {
    set({
      energyHistory: [],
    });
  },

  executeCommand: (command) => {
    const actions = get();

    switch (command.action) {
      case "START_CHILLER":
        return actions.startChiller(command.equipmentId);

      case "STOP_CHILLER":
        return actions.stopChiller(command.equipmentId);

      case "START_AHU":
        return actions.startAhu(command.equipmentId);

      case "STOP_AHU":
        return actions.stopAhu(command.equipmentId);

      case "SET_AHU_FAN_SPEED":
        return actions.setAhuFanSpeed(command.equipmentId, command.value);

      case "SET_AHU_SETPOINT":
        return actions.setAhuSetpoint(command.equipmentId, command.value);

      case "SHOW_PLANT_STATUS": {
        const state = get();

        const runningChillers = state.chillers.filter(
          (chiller) => chiller.status === "running",
        ).length;

        const runningAhus = state.ahus.filter(
          (ahu) => ahu.status === "running",
        ).length;

        return {
          success: true,

          message:
            `Plant operating normally. ` +
            `${runningChillers} chillers are running, ` +
            `${runningAhus} AHUs are running, ` +
            `${state.activeAlarmCount} alarms are active, ` +
            `and total plant power is ${state.totalPowerKw} kW.`,
        };
      }

      case "UNKNOWN":
        return {
          success: false,
          message: "LUMI could not understand that command.",
        };
    }
  },
}));
