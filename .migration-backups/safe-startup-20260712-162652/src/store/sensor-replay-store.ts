"use client";

import { create } from "zustand";

import {
  calculateRequiredChillerCount,
  parseSensorCsv,
} from "@/lib/sensor-data/sensor-csv-parser";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";

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

const chillerIds = ["CH-01", "CH-02", "CH-03", "CH-04"] as const;

function stagePlantForRow(row: SensorCsvRow): void {
  const enterprise = useEnterprisePlantStore.getState();

  const requiredChillers = calculateRequiredChillerCount(
    row.effectiveCoolingLoadKw,
    52,
    85,
  );

  // CSV Replay owns staging. Suspend the internal synthetic demand model.
  enterprise.setAutomaticControl(false);

  const currentlyRunning = enterprise.groups
    .filter((group) => group.status === "running")
    .map((group) => group.chillerId);

  for (let index = 0; index < chillerIds.length; index += 1) {
    const chillerId = chillerIds[index];
    const shouldRun = index < requiredChillers;
    const isRunning = currentlyRunning.includes(chillerId);

    if (shouldRun && !isRunning) {
      useEnterprisePlantStore.getState().startChillerGroup(chillerId);
    }

    if (!shouldRun && isRunning) {
      useEnterprisePlantStore.getState().stopChillerGroup(chillerId);
    }
  }

  useEnterprisePlantStore.setState(() => ({
    occupancy: row.passengerCount,
    outdoorDryBulbTemperatureC: row.outdoorDryBulbC,
    outdoorWetBulbTemperatureC: row.outdoorWetBulbC,
    predictedCoolingLoadKw: row.effectiveCoolingLoadKw,
    coolingDemandPercent: Math.min(
      100,
      (row.effectiveCoolingLoadKw / (52 * 4)) * 100,
    ),
    requiredChillerCount: requiredChillers,
    sequenceState: requiredChillers > 0 ? "running" : "idle",
    currentSequenceMessage: `CSV Replay: ${requiredChillers} chiller group(s) required at ${new Date(
      row.timestamp,
    ).toLocaleTimeString()}.`,
    lastCompletedStep: "CSV sensor snapshot applied",
    failedSequenceStep:
      row.sensorQuality === "BAD" || row.sensorQuality === "MISSING"
        ? "Sensor data quality"
        : null,
  }));
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

    stagePlantForRow(row);

    set({
      currentIndex: safeIndex,
      status: safeIndex === rows.length - 1 ? "completed" : get().status,
      message: `Applied ${new Date(
        row.timestamp,
      ).toLocaleString()} — ${calculateRequiredChillerCount(row.effectiveCoolingLoadKw)} chiller(s) required.`,
    });
  },

  applyLatest: () => {
    const { rows } = get();

    if (rows.length === 0) {
      return;
    }

    get().applyRow(rows.length - 1);
  },

  play: () => {
    if (get().rows.length === 0) {
      return;
    }

    if (get().currentIndex >= get().rows.length - 1) {
      set({
        currentIndex: 0,
      });
    }

    set({
      status: "playing",
      message: "CSV replay is running.",
    });
  },

  pause: () => {
    set({
      status: "paused",
      message: "CSV replay paused.",
    });
  },

  stepForward: () => {
    const nextIndex = Math.min(get().rows.length - 1, get().currentIndex + 1);

    get().applyRow(nextIndex);
  },

  stepBackward: () => {
    const previousIndex = Math.max(0, get().currentIndex - 1);

    get().applyRow(previousIndex);
  },

  resetReplay: () => {
    const enterprise = useEnterprisePlantStore.getState();

    enterprise.stopAllEquipment();

    set({
      currentIndex: 0,
      status: get().rows.length > 0 ? "ready" : "empty",
      message:
        "Replay reset. Plant equipment was safely stopped; cumulative meters remain preserved.",
    });
  },

  clearImport: () => {
    useEnterprisePlantStore.getState().stopAllEquipment();

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
