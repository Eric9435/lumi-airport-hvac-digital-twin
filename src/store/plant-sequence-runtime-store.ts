import { create } from "zustand";

import {
  getRemainingSeconds,
  getSequenceStep,
  PLANT_SEQUENCE_STEPS,
} from "@/lib/enterprise/plant-sequence-engine";

const TOTAL_SEQUENCE_DURATION_SECONDS = PLANT_SEQUENCE_STEPS.reduce(
  (total, step) => total + step.duration,
  0,
);

interface PlantSequenceRuntime {
  active: boolean;

  completed: boolean;

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

  completed: false,

  elapsed: 0,

  equipment: "",

  action: "",

  remaining: 0,

  events: [],

  startSequence: () =>
    set({
      active: true,

      completed: false,

      elapsed: 0,

      equipment: PLANT_SEQUENCE_STEPS[0]?.equipment ?? "Controller",

      action: PLANT_SEQUENCE_STEPS[0]?.action ?? "Cooling demand analysis",

      remaining: PLANT_SEQUENCE_STEPS[0]?.duration ?? 0,

      events: [
        "0s | CSV cooling demand detected",
        `0s | ${PLANT_SEQUENCE_STEPS[0]?.equipment ?? "Controller"} | ${
          PLANT_SEQUENCE_STEPS[0]?.action ?? "Cooling demand analysis"
        }`,
      ],
    }),

  tick: () =>
    set((state) => {
      if (!state.active) return state;

      const elapsed = state.elapsed + 1;

      if (elapsed >= TOTAL_SEQUENCE_DURATION_SECONDS) {
        const finalStep = PLANT_SEQUENCE_STEPS[PLANT_SEQUENCE_STEPS.length - 1];

        const completionEvent =
          `${TOTAL_SEQUENCE_DURATION_SECONDS}s | ` + "Plant sequence completed";

        return {
          ...state,

          active: false,

          completed: true,

          elapsed: TOTAL_SEQUENCE_DURATION_SECONDS,

          equipment: finalStep?.equipment ?? "AHU",

          action: "Plant sequence completed",

          remaining: 0,

          events: state.events.includes(completionEvent)
            ? state.events
            : [...state.events, completionEvent],
        };
      }

      const step = getSequenceStep(elapsed);

      const remaining = getRemainingSeconds(elapsed);

      const previousStep = elapsed > 0 ? getSequenceStep(elapsed - 1) : step;

      const stepChanged = previousStep.id !== step.id;

      const event = stepChanged
        ? `${elapsed}s | ${step.equipment} | ${step.action}`
        : null;

      return {
        ...state,

        elapsed,

        equipment: step.equipment,

        action: step.action,

        remaining,

        active: true,

        completed: false,

        events:
          event && !state.events.includes(event)
            ? [...state.events, event]
            : state.events,
      };
    }),

  reset: () =>
    set({
      active: false,

      completed: false,

      elapsed: 0,

      equipment: "",

      action: "",

      remaining: 0,

      events: [],
    }),
}));
