import { create } from "zustand";

import {
  getSequenceStep,
  getRemainingSeconds,
} from "@/lib/enterprise/plant-sequence-engine";

interface PlantSequenceRuntime {
  active: boolean;

  elapsed: number;

  equipment: string;

  action: string;

  remaining: number;

  events: string[];

  startSequence: () => void;

  tick: () => void;

  reset: () => void;
}

export const usePlantSequenceRuntime = create<PlantSequenceRuntime>((set) => ({
  active: false,

  elapsed: 0,

  equipment: "",

  action: "",

  remaining: 0,

  events: [],

  startSequence: () =>
    set({
      active: true,

      elapsed: 0,

      equipment: "Controller",

      action: "Demand detected",

      remaining: 5,

      events: ["CSV cooling demand detected"],
    }),

  tick: () =>
    set((state) => {
      if (!state.active) return state;

      const elapsed = state.elapsed + 1;

      const step = getSequenceStep(elapsed);

      const remaining = getRemainingSeconds(elapsed);

      const event = `${elapsed}s | ${step.equipment} | ${step.action}`;

      return {
        elapsed,

        equipment: step.equipment,

        action: step.action,

        remaining,

        active: remaining > 0,

        events: state.events.includes(event)
          ? state.events
          : [...state.events, event],
      };
    }),

  reset: () =>
    set({
      active: false,

      elapsed: 0,

      equipment: "",

      action: "",

      remaining: 0,

      events: [],
    }),
}));
