import { create } from "zustand";

import {
  getActiveSequenceStep,
  PLANT_START_SEQUENCE,
} from "@/lib/enterprise/sequence-timeline-engine";

interface SequenceStore {
  seconds: number;

  running: boolean;

  events: string[];

  start: () => void;

  tick: () => void;

  reset: () => void;
}

export const useSequenceTimelineStore = create<SequenceStore>((set) => ({
  seconds: 0,

  running: false,

  events: [],

  start: () =>
    set({
      seconds: 0,
      running: true,
      events: ["Sequence started"],
    }),

  tick: () =>
    set((state) => {
      if (!state.running) return state;

      const seconds = state.seconds + 1;

      const step = getActiveSequenceStep(seconds);

      const last = state.events[state.events.length - 1];

      const message = `${seconds}s : ${step.equipment} - ${step.action}`;

      return {
        seconds,

        running: seconds < 180,

        events: last === message ? state.events : [...state.events, message],
      };
    }),

  reset: () =>
    set({
      seconds: 0,
      running: false,
      events: [],
    }),
}));
