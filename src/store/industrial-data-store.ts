import { create } from "zustand";

import {
  parseAhuEnvironmentCsv,
  parseAlarmEventsCsv,
  parseEquipmentConditionCsv,
} from "@/lib/industrial-data/industrial-csv-parser";

import type {
  AhuEnvironmentCsvRow,
  AlarmEventCsvRow,
  EquipmentConditionCsvRow,
  IndustrialCsvIssue,
  IndustrialCsvParseResult,
  IndustrialSnapshot,
} from "@/types/industrial-csv";

interface IndustrialDataStore {
  ahuFilename: string | null;
  conditionFilename: string | null;
  alarmFilename: string | null;

  ahuResult: IndustrialCsvParseResult<AhuEnvironmentCsvRow> | null;

  conditionResult: IndustrialCsvParseResult<EquipmentConditionCsvRow> | null;

  alarmResult: IndustrialCsvParseResult<AlarmEventCsvRow> | null;

  currentTimestampIndex: number;
  timestamps: string[];

  importAhuCsv: (filename: string, text: string) => void;

  importConditionCsv: (filename: string, text: string) => void;

  importAlarmCsv: (filename: string, text: string) => void;

  loadSamples: () => Promise<void>;
  setTimestampIndex: (index: number) => void;
  clear: () => void;
  getSnapshot: () => IndustrialSnapshot;
  getIssues: () => IndustrialCsvIssue[];
}

function timestampsFromRows(
  ahuRows: AhuEnvironmentCsvRow[],
  conditionRows: EquipmentConditionCsvRow[],
): string[] {
  return Array.from(
    new Set([
      ...ahuRows.map((row) => row.timestamp),
      ...conditionRows.map((row) => row.timestamp),
    ]),
  ).sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
}

export const useIndustrialDataStore = create<IndustrialDataStore>(
  (set, get) => ({
    ahuFilename: null,
    conditionFilename: null,
    alarmFilename: null,

    ahuResult: null,
    conditionResult: null,
    alarmResult: null,

    currentTimestampIndex: 0,
    timestamps: [],

    importAhuCsv: (filename, text) => {
      const ahuResult = parseAhuEnvironmentCsv(text);

      const conditionRows = get().conditionResult?.rows ?? [];

      set({
        ahuFilename: filename,
        ahuResult,
        timestamps: timestampsFromRows(ahuResult.rows, conditionRows),
        currentTimestampIndex: 0,
      });
    },

    importConditionCsv: (filename, text) => {
      const conditionResult = parseEquipmentConditionCsv(text);

      const ahuRows = get().ahuResult?.rows ?? [];

      set({
        conditionFilename: filename,
        conditionResult,
        timestamps: timestampsFromRows(ahuRows, conditionResult.rows),
        currentTimestampIndex: 0,
      });
    },

    importAlarmCsv: (filename, text) => {
      set({
        alarmFilename: filename,
        alarmResult: parseAlarmEventsCsv(text),
      });
    },

    loadSamples: async () => {
      const paths = [
        "/data/yia-ahu-environment-24h-10min.csv",
        "/data/yia-equipment-condition-24h-10min.csv",
        "/data/yia-alarm-events-24h.csv",
      ];

      const responses = await Promise.all(paths.map((path) => fetch(path)));

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`Could not load ${response.url}`);
        }
      }

      const [ahuText, conditionText, alarmText] = await Promise.all(
        responses.map((response) => response.text()),
      );

      get().importAhuCsv("yia-ahu-environment-24h-10min.csv", ahuText);

      get().importConditionCsv(
        "yia-equipment-condition-24h-10min.csv",
        conditionText,
      );

      get().importAlarmCsv("yia-alarm-events-24h.csv", alarmText);
    },

    setTimestampIndex: (index) => {
      const maximum = Math.max(0, get().timestamps.length - 1);

      set({
        currentTimestampIndex: Math.min(maximum, Math.max(0, index)),
      });
    },

    clear: () => {
      set({
        ahuFilename: null,
        conditionFilename: null,
        alarmFilename: null,
        ahuResult: null,
        conditionResult: null,
        alarmResult: null,
        timestamps: [],
        currentTimestampIndex: 0,
      });
    },

    getSnapshot: () => {
      const state = get();

      const timestamp = state.timestamps[state.currentTimestampIndex] ?? null;

      if (!timestamp) {
        return {
          timestamp: null,
          ahus: [],
          equipment: [],
          activeAlarms: [],
        };
      }

      const currentTime = new Date(timestamp).getTime();

      const activeAlarms = (state.alarmResult?.rows ?? []).filter((alarm) => {
        const raised = new Date(alarm.raisedAt).getTime();

        const cleared = alarm.clearedAt
          ? new Date(alarm.clearedAt).getTime()
          : Number.POSITIVE_INFINITY;

        return currentTime >= raised && currentTime < cleared;
      });

      return {
        timestamp,
        ahus:
          state.ahuResult?.rows.filter((row) => row.timestamp === timestamp) ??
          [],
        equipment:
          state.conditionResult?.rows.filter(
            (row) => row.timestamp === timestamp,
          ) ?? [],
        activeAlarms,
      };
    },

    getIssues: () => {
      const state = get();

      return [
        ...(state.ahuResult?.issues ?? []),
        ...(state.conditionResult?.issues ?? []),
        ...(state.alarmResult?.issues ?? []),
      ];
    },
  }),
);
