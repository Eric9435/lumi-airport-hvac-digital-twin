import { create } from "zustand";

export type SensorHistoryPoint = {
  timestamp: string;
  coolingLoadKw: number;
  chwSupplyTempC: number;
  chwReturnTempC: number;
  powerKw: number;
  ahuDemandPercent: number;
};

type SensorHistoryStore = {
  history: SensorHistoryPoint[];
  addPoint: (point: SensorHistoryPoint) => void;
  clearHistory: () => void;
};

export const useSensorHistoryStore = create<SensorHistoryStore>((set) => ({
  history: [],

  addPoint: (point) =>
    set((state) => ({
      history: [...state.history.slice(-100), point],
    })),

  clearHistory: () =>
    set({
      history: [],
    }),
}));
