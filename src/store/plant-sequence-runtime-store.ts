import { create } from "zustand";

import {
  getRemainingSeconds,
  getSequenceStep,
  PLANT_SEQUENCE_STEPS,
} from "@/lib/enterprise/plant-sequence-engine";
import { useEnterprisePlantStore } from "@/store/enterprise-plant-store";

const MAX_CHILLER_GROUPS = 4;

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

  requiredChillers: number;

  events: string[];

  startSequence: (requiredChillers?: number) => void;

  tick: () => void;

  reset: () => void;
}

function clampRequiredChillers(requiredChillers: number) {
  return Math.min(
    MAX_CHILLER_GROUPS,
    Math.max(0, Math.round(requiredChillers)),
  );
}

function equipmentId(prefix: string, groupNumber: number) {
  return `${prefix}-${String(groupNumber).padStart(2, "0")}`;
}

function startRequiredEquipment(
  equipment: string,
  requiredChillers: number,
  elapsed: number,
) {
  const count = clampRequiredChillers(requiredChillers);

  if (count === 0) return;

  const enterpriseStore = useEnterprisePlantStore.getState();

  switch (equipment) {
    case "Controller": {
      useEnterprisePlantStore.setState({
        sequenceState: "calculating-demand",
        currentSequenceMessage: `CSV sequence started for ${count} required chiller group(s).`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Transformer": {
      for (let index = 1; index <= count; index += 1) {
        enterpriseStore.startEquipment(equipmentId("TR", index));
      }

      useEnterprisePlantStore.setState({
        sequenceState: "energizing-transformer",
        currentSequenceMessage: `${count} transformer(s) energized by CSV sequence at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Primary CHW Pump": {
      for (let index = 1; index <= count; index += 1) {
        enterpriseStore.startEquipment(equipmentId("PCHWP", index));
      }

      useEnterprisePlantStore.setState({
        sequenceState: "starting-primary-pump",
        currentSequenceMessage: `${count} primary chilled-water pump(s) started at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Flow Sensor": {
      useEnterprisePlantStore.setState({
        sequenceState: "proving-evaporator-flow",
        currentSequenceMessage: `Evaporator flow proof confirmed for ${count} group(s) at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Condenser Pump": {
      for (let index = 1; index <= count; index += 1) {
        enterpriseStore.startEquipment(equipmentId("CWP", index));
      }

      useEnterprisePlantStore.setState({
        sequenceState: "starting-condenser-pump",
        currentSequenceMessage: `${count} condenser-water pump(s) started at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Cooling Tower": {
      const requiredTowerCount = Math.min(
        MAX_CHILLER_GROUPS,
        Math.max(1, Math.ceil(count / 2)),
      );

      for (let index = 1; index <= requiredTowerCount; index += 1) {
        enterpriseStore.startEquipment(equipmentId("CT", index));
      }

      useEnterprisePlantStore.setState({
        sequenceState: "staging-cooling-towers",
        currentSequenceMessage: `${requiredTowerCount} cooling tower(s) started for ${count} chiller group(s) at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Star Delta Starter": {
      for (let index = 1; index <= count; index += 1) {
        enterpriseStore.startEquipment(
          `SD-CH-${String(index).padStart(2, "0")}`,
        );
      }

      useEnterprisePlantStore.setState({
        sequenceState: "starting-chiller",
        currentSequenceMessage: `${count} Star–Delta starter(s) reached Delta at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "Chiller Compressor": {
      for (let index = 1; index <= count; index += 1) {
        enterpriseStore.startEquipment(equipmentId("CH", index));
      }

      useEnterprisePlantStore.setState({
        sequenceState: "running",
        currentSequenceMessage: `${count} chiller compressor group(s) running at ${elapsed}s.`,
        failedSequenceStep: null,
      });

      break;
    }

    case "AHU": {
      useEnterprisePlantStore.setState({
        sequenceState: "running",
        currentSequenceMessage: `AHU enable command issued after ${count} chiller group(s) became available.`,
        failedSequenceStep: null,
      });

      break;
    }

    default:
      break;
  }
}

export const usePlantSequenceRuntime = create<PlantSequenceRuntime>(
  (set, get) => ({
    active: false,

    completed: false,

    elapsed: 0,

    equipment: "",

    action: "",

    remaining: 0,

    requiredChillers: 0,

    events: [],

    startSequence: (requestedChillers = 1) => {
      const requiredChillers = clampRequiredChillers(requestedChillers);

      if (requiredChillers === 0 || get().active) return;

      const firstStep = PLANT_SEQUENCE_STEPS[0];

      startRequiredEquipment(
        firstStep?.equipment ?? "Controller",
        requiredChillers,
        0,
      );

      set({
        active: true,

        completed: false,

        elapsed: 0,

        equipment: firstStep?.equipment ?? "Controller",

        action: firstStep?.action ?? "Cooling demand analysis",

        remaining: firstStep?.duration ?? 0,

        requiredChillers,

        events: [
          `0s | CSV cooling demand detected | ${requiredChillers} chiller group(s) required`,
          `0s | ${firstStep?.equipment ?? "Controller"} | ${
            firstStep?.action ?? "Cooling demand analysis"
          }`,
        ],
      });
    },

    tick: () =>
      set((state) => {
        if (!state.active) return state;

        const elapsed = state.elapsed + 1;

        if (elapsed >= TOTAL_SEQUENCE_DURATION_SECONDS) {
          const completionEvent =
            `${TOTAL_SEQUENCE_DURATION_SECONDS}s | ` +
            `${state.requiredChillers} chiller group(s) sequence completed`;

          useEnterprisePlantStore.setState({
            sequenceState: "running",
            currentSequenceMessage:
              `CSV automatic plant sequence completed. ` +
              `${state.requiredChillers} chiller group(s) are available.`,
            failedSequenceStep: null,
          });

          return {
            ...state,

            active: false,

            completed: true,

            elapsed: TOTAL_SEQUENCE_DURATION_SECONDS,

            equipment:
              PLANT_SEQUENCE_STEPS[PLANT_SEQUENCE_STEPS.length - 1]
                ?.equipment ?? "AHU",

            action: "Plant sequence completed",

            remaining: 0,

            events: state.events.includes(completionEvent)
              ? state.events
              : [...state.events, completionEvent],
          };
        }

        const currentStep = getSequenceStep(elapsed);

        const previousStep =
          elapsed > 0 ? getSequenceStep(elapsed - 1) : currentStep;

        const stepChanged = previousStep.id !== currentStep.id;

        if (stepChanged) {
          startRequiredEquipment(
            currentStep.equipment,
            state.requiredChillers,
            elapsed,
          );
        }

        const remaining = getRemainingSeconds(elapsed);

        const event = stepChanged
          ? `${elapsed}s | ${currentStep.equipment} | ${currentStep.action}`
          : null;

        return {
          ...state,

          active: true,

          completed: false,

          elapsed,

          equipment: currentStep.equipment,

          action: currentStep.action,

          remaining,

          events:
            event && !state.events.includes(event)
              ? [...state.events, event]
              : state.events,
        };
      }),

    reset: () => {
      useEnterprisePlantStore.setState({
        sequenceState: "idle",
        currentSequenceMessage:
          "CSV plant sequence reset. Waiting for cooling demand.",
        failedSequenceStep: null,
      });

      set({
        active: false,

        completed: false,

        elapsed: 0,

        equipment: "",

        action: "",

        remaining: 0,

        requiredChillers: 0,

        events: [],
      });
    },
  }),
);
