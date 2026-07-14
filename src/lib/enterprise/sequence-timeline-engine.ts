export type SequenceStatus = "WAITING" | "RUNNING" | "COMPLETE";

export interface SequenceStep {
  id: string;
  equipment: string;
  action: string;
  delay: number;
  status: SequenceStatus;
}

export const PLANT_START_SEQUENCE: SequenceStep[] = [
  {
    id: "LOAD",
    equipment: "Controller",
    action: "Cooling load analysis",
    delay: 5,
    status: "WAITING",
  },

  {
    id: "TR",
    equipment: "Transformer",
    action: "Energizing transformer",
    delay: 15,
    status: "WAITING",
  },

  {
    id: "PCHWP",
    equipment: "Primary CHW Pump",
    action: "Starting chilled water pump",
    delay: 20,
    status: "WAITING",
  },

  {
    id: "FLOW",
    equipment: "Flow Sensor",
    action: "Checking flow proof",
    delay: 15,
    status: "WAITING",
  },

  {
    id: "CWP",
    equipment: "Condenser Pump",
    action: "Starting condenser pump",
    delay: 20,
    status: "WAITING",
  },

  {
    id: "CT",
    equipment: "Cooling Tower",
    action: "Starting tower fan",
    delay: 30,
    status: "WAITING",
  },

  {
    id: "SD",
    equipment: "Star Delta",
    action: "Changing contactor",
    delay: 30,
    status: "WAITING",
  },

  {
    id: "CHILLER",
    equipment: "Chiller",
    action: "Compressor running",
    delay: 45,
    status: "WAITING",
  },

  {
    id: "AHU",
    equipment: "AHU",
    action: "Enabling cooling valves",
    delay: 30,
    status: "WAITING",
  },
];

export function getActiveSequenceStep(seconds: number) {
  let total = 0;

  for (const step of PLANT_START_SEQUENCE) {
    total += step.delay;

    if (seconds <= total) return step;
  }

  return PLANT_START_SEQUENCE[PLANT_START_SEQUENCE.length - 1];
}
