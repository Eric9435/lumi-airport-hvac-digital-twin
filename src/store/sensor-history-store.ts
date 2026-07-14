import { create } from "zustand";

export interface SensorHistoryPoint {
  timestamp: string;
  coolingLoadKw: number;
  effectiveCoolingLoadKw: number;
  chwSupplyTempC: number;
  chwReturnTempC: number;
  powerKw: number;
  ahuDemandPercent: number;
  passengers: number;
}

interface SensorHistoryStore {
  history: SensorHistoryPoint[];

  addPoint: (point: SensorHistoryPoint) => void;

  clearHistory: () => void;
}

const MAX_HISTORY_POINTS = 144;

export const useSensorHistoryStore = create<SensorHistoryStore>((set) => ({
  history: [],

  addPoint: (point) =>
    set((state) => {
      const lastPoint = state.history.at(-1);

      /*
       * Route changes and React development rendering must
       * not insert the same CSV timestamp twice.
       */
      if (lastPoint?.timestamp === point.timestamp) {
        return state;
      }

      return {
        history: [...state.history, point].slice(-MAX_HISTORY_POINTS),
      };
    }),

  clearHistory: () =>
    set({
      history: [],
    }),
}));
