export type EquipmentSequenceState =
  | "IDLE"
  | "ANALYZING"
  | "TRANSFORMER_START"
  | "PUMP_START"
  | "FLOW_CHECK"
  | "CONDENSER_START"
  | "COOLING_TOWER_START"
  | "CHILLER_START"
  | "AHU_ENABLE"
  | "STABLE";

export interface SequenceStage {
  name: string;
  equipment: string;
  duration: number;
  state: EquipmentSequenceState;
}

export const HVAC_SEQUENCE: SequenceStage[] = [
  {
    name: "Load Analysis",
    equipment: "Controller",
    duration: 5,
    state: "ANALYZING",
  },

  {
    name: "Transformer Energizing",
    equipment: "Transformer",
    duration: 15,
    state: "TRANSFORMER_START",
  },

  {
    name: "Primary CHW Pump",
    equipment: "PCHWP",
    duration: 20,
    state: "PUMP_START",
  },

  {
    name: "Evaporator Flow Proof",
    equipment: "Flow Sensor",
    duration: 15,
    state: "FLOW_CHECK",
  },

  {
    name: "Condenser Pump",
    equipment: "CWP",
    duration: 20,
    state: "CONDENSER_START",
  },

  {
    name: "Cooling Tower Fan",
    equipment: "Cooling Tower",
    duration: 30,
    state: "COOLING_TOWER_START",
  },

  {
    name: "Chiller Compressor",
    equipment: "Chiller",
    duration: 45,
    state: "CHILLER_START",
  },

  {
    name: "AHU Enable",
    equipment: "AHU",
    duration: 30,
    state: "AHU_ENABLE",
  },

  {
    name: "Normal Operation",
    equipment: "Plant",
    duration: 0,
    state: "STABLE",
  },
];

export function calculateSequence(seconds: number) {
  let total = 0;

  for (const stage of HVAC_SEQUENCE) {
    total += stage.duration;

    if (seconds <= total) return stage;
  }

  return HVAC_SEQUENCE[HVAC_SEQUENCE.length - 1];
}
