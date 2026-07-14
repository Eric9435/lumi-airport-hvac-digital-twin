export type SequenceStatus = "idle" | "running" | "completed";

export interface PlantSequenceStep {
  id: string;
  equipment: string;
  action: string;
  duration: number;
}

export const PLANT_SEQUENCE_STEPS: PlantSequenceStep[] = [
  {
    id: "load",
    equipment: "Controller",
    action: "Cooling demand analysis",
    duration: 5,
  },

  {
    id: "transformer",
    equipment: "Transformer",
    action: "Energizing transformer",
    duration: 15,
  },

  {
    id: "chw-pump",
    equipment: "Primary CHW Pump",
    action: "Starting chilled water pump",
    duration: 20,
  },

  {
    id: "flow",
    equipment: "Flow Sensor",
    action: "Checking evaporator flow proof",
    duration: 15,
  },

  {
    id: "condenser-pump",
    equipment: "Condenser Pump",
    action: "Starting condenser water pump",
    duration: 20,
  },

  {
    id: "tower",
    equipment: "Cooling Tower",
    action: "Starting cooling tower fans",
    duration: 30,
  },

  {
    id: "star-delta",
    equipment: "Star Delta Starter",
    action: "Transitioning motor starter",
    duration: 20,
  },

  {
    id: "chiller",
    equipment: "Chiller Compressor",
    action: "Starting compressor",
    duration: 45,
  },

  {
    id: "ahu",
    equipment: "AHU",
    action: "Enabling air handling units",
    duration: 30,
  },
];

export function getSequenceStep(seconds: number) {
  let total = 0;

  for (const step of PLANT_SEQUENCE_STEPS) {
    total += step.duration;

    if (seconds <= total) return step;
  }

  return PLANT_SEQUENCE_STEPS[PLANT_SEQUENCE_STEPS.length - 1];
}

export function getRemainingSeconds(seconds: number) {
  let total = 0;

  for (const step of PLANT_SEQUENCE_STEPS) {
    total += step.duration;

    if (seconds <= total) return total - seconds;
  }

  return 0;
}
