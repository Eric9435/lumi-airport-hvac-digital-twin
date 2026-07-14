import { create } from "zustand";

import {
  calculateSequence,
  EquipmentSequenceState,
} from "@/lib/enterprise/hvac-dynamic-sequence-engine";

interface SequenceRuntime {
  active: boolean;

  elapsed: number;

  state: EquipmentSequenceState;

  currentEquipment: string;

  events: string[];

  startSequence: () => void;

  tick: () => void;

  reset: () => void;
}

export const useHVACSequenceRuntime = create<SequenceRuntime>((set) => ({
  active: false,

  elapsed: 0,

  state: "IDLE",

  currentEquipment: "",

  events: [],

  startSequence: () =>
    set({
      active: true,
      elapsed: 0,
      state: "ANALYZING",
      currentEquipment: "Controller",
      events: ["CSV demand detected"],
    }),

  tick: () =>
    set((current) => {
      if (!current.active) return current;

      const elapsed = current.elapsed + 1;

      const stage = calculateSequence(elapsed);

      const event = `${elapsed}s | ${stage.equipment} | ${stage.name}`;

      return {
        elapsed,

        state: stage.state,

        currentEquipment: stage.equipment,

        active: stage.state !== "STABLE",

        events: current.events.includes(event)
          ? current.events
          : [...current.events, event],
      };
    }),

  reset: () =>
    set({
      active: false,
      elapsed: 0,
      state: "IDLE",
      currentEquipment: "",
      events: [],
    }),
}));
