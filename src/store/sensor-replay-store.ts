"use client";

import { create } from "zustand";

import {
  calculateRequiredChillerCount,
  parseSensorCsv,
} from "@/lib/sensor-data/sensor-csv-parser";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";
import { usePlantSequenceRuntime } from "@/store/plant-sequence-runtime-store";
import { useSimulationStore } from "@/store/simulation-store";

import type { SensorCsvParseResult, SensorCsvRow } from "@/types/sensor-csv";

export type ReplayStatus =
  "empty" | "ready" | "playing" | "paused" | "completed" | "error";

interface SensorReplayState {
  filename: string | null;
  rows: SensorCsvRow[];
  validation: SensorCsvParseResult | null;
  currentIndex: number;
  status: ReplayStatus;
  speed: number;
  message: string;

  importCsvText: (filename: string, csvText: string) => void;
  loadSampleCsv: () => Promise<void>;
  applyRow: (index: number) => void;
  applyLatest: () => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetReplay: () => void;
  clearImport: () => void;
  setSpeed: (speed: number) => void;
}

function applyCsvSnapshot(row: SensorCsvRow): void {
  const requiredChillers = calculateRequiredChillerCount(
    row.effectiveCoolingLoadKw,
    52,
    85,
  );

  const enterprise = useEnterprisePlantStore.getState();
  const runningChillers = enterprise.groups.filter(
    (group) => group.status === "running",
  ).length;

  enterprise.setAutomaticControl(false);

  useEnterprisePlantStore.setState({
    occupancy: row.passengerCount,
    outdoorDryBulbTemperatureC: row.outdoorDryBulbC,
    outdoorWetBulbTemperatureC: row.outdoorWetBulbC,
    predictedCoolingLoadKw: row.effectiveCoolingLoadKw,
    coolingDemandPercent: Math.min(
      100,
      (row.effectiveCoolingLoadKw / (52 * 4)) * 100,
    ),
    requiredChillerCount: requiredChillers,
    sequenceState:
      requiredChillers === runningChillers
        ? requiredChillers > 0
          ? "running"
          : "idle"
        : "selecting-equipment",
    currentSequenceMessage:
      `CSV snapshot ${new Date(row.timestamp).toLocaleTimeString()} accepted. ` +
      `Target ${requiredChillers}; currently running ${runningChillers}. ` +
      "Equipment will change only through the staged sequence.",
    lastCompletedStep: "CSV demand snapshot accepted",
    failedSequenceStep:
      row.sensorQuality === "BAD" || row.sensorQuality === "MISSING"
        ? "Sensor data quality"
        : null,
  });
}

function clearCsvSequenceHistory(): void {
  useEnterprisePlantStore.setState({
    sequenceEvents: [],
  });
}

export const useSensorReplayStore = create<SensorReplayState>((set, get) => ({
  filename: null,
  rows: [],
  validation: null,
  currentIndex: 0,
  status: "empty",
  speed: 1,
  message: "Upload a validated sensor CSV or load the sample dataset.",

  importCsvText: (filename, csvText) => {
    const validation = parseSensorCsv(csvText);

    if (validation.validRowCount === 0 || validation.invalidRowCount > 0) {
      set({
        filename,
        rows: validation.rows,
        validation,
        currentIndex: 0,
        status: "error",
        message:
          validation.validRowCount === 0
            ? "No valid sensor rows were found."
            : "CSV contains invalid rows. Correct them before replay.",
      });
      return;
    }

    set({
      filename,
      rows: validation.rows,
      validation,
      currentIndex: 0,
      status: "ready",
      message: `${validation.validRowCount} validated sensor snapshots are ready.`,
    });
  },

  loadSampleCsv: async () => {
    try {
      const response = await fetch("/data/yia-24h-10min.csv", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Sample CSV request failed: ${response.status}`);
      }

      const csvText = await response.text();
      get().importCsvText("yia-24h-10min.csv", csvText);
    } catch (error) {
      set({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to load sample CSV.",
      });
    }
  },

  applyRow: (index) => {
    const { rows } = get();

    if (rows.length === 0) {
      return;
    }

    const safeIndex = Math.min(rows.length - 1, Math.max(0, index));
    const row = rows[safeIndex];

    if (row.sensorQuality === "BAD" || row.sensorQuality === "MISSING") {
      set({
        currentIndex: safeIndex,
        status: "paused",
        message: `Replay paused: sensor quality is ${row.sensorQuality}.`,
      });
      return;
    }

    applyCsvSnapshot(row);

    set({
      currentIndex: safeIndex,
      status: safeIndex === rows.length - 1 ? "completed" : get().status,
      message:
        `${new Date(row.timestamp).toLocaleString()} snapshot accepted — ` +
        `${calculateRequiredChillerCount(row.effectiveCoolingLoadKw)} chiller(s) targeted.`,
    });
  },

  applyLatest: () => {
    const { rows } = get();

    if (rows.length > 0) {
      get().applyRow(rows.length - 1);
    }
  },

  play: () => {
    const state = get();

    if (state.rows.length === 0 || state.status === "error") {
      return;
    }

    const restartFromBeginning = state.currentIndex >= state.rows.length - 1;
    const freshReplayStart = state.status === "ready" || restartFromBeginning;
    const nextIndex = restartFromBeginning ? 0 : state.currentIndex;

    if (freshReplayStart) {
      useEnterprisePlantStore.getState().stopAllEquipment();
      clearCsvSequenceHistory();
      usePlantSequenceRuntime.getState().reset();
    }

    set({
      currentIndex: nextIndex,
      status: "playing",
      message: "CSV replay is running.",
    });

    get().applyRow(nextIndex);
  },

  pause: () => {
    set({
      status: "paused",
      message: "CSV replay paused.",
    });
  },

  stepForward: () => {
    get().applyRow(Math.min(get().rows.length - 1, get().currentIndex + 1));
  },

  stepBackward: () => {
    get().applyRow(Math.max(0, get().currentIndex - 1));
  },

  resetReplay: () => {
    useEnterprisePlantStore.getState().stopAllEquipment();
    clearCsvSequenceHistory();
    usePlantSequenceRuntime.getState().reset();
    useSimulationStore.getState().resetSimulation();

    set({
      currentIndex: 0,
      status: get().rows.length > 0 ? "ready" : "empty",
      message:
        "Replay reset. Plant equipment and CSV sequence were safely reset; cumulative meters remain preserved.",
    });
  },

  clearImport: () => {
    useEnterprisePlantStore.getState().stopAllEquipment();
    clearCsvSequenceHistory();
    usePlantSequenceRuntime.getState().reset();
    useSimulationStore.getState().resetSimulation();

    set({
      filename: null,
      rows: [],
      validation: null,
      currentIndex: 0,
      status: "empty",
      message: "Imported CSV data cleared.",
    });
  },

  setSpeed: (speed) => {
    set({
      speed: Math.min(60, Math.max(0.25, speed)),
    });
  },
}));
