import { create } from "zustand";

export type EquipmentStatus = "RUNNING" | "STOPPED" | "FAILED" | "WARNING";

export interface FaultEvent {
  id: string;
  equipment: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  timestamp: string;
}

interface EquipmentFaultState {
  chillers: {
    id: string;
    status: EquipmentStatus;
    capacityKw: number;
    loadPercent: number;
    powerKw: number;
    cop: number;
    alarm: boolean;
  }[];

  pumps: {
    id: string;
    status: EquipmentStatus;
    flowM3h: number;
    pressureKpa: number;
    powerKw: number;
    alarm: boolean;
  }[];

  ahus: {
    id: string;
    status: EquipmentStatus;
    airflowCmh: number;
    temperatureC: number;
    setpointC: number;
    alarm: boolean;
  }[];

  faults: FaultEvent[];

  stopChiller: (id: string) => void;
  startChiller: (id: string) => void;
}

export const useEquipmentFaultStore = create<EquipmentFaultState>((set) => ({
  chillers: [
    {
      id: "CH-01",
      status: "RUNNING",
      capacityKw: 100,
      loadPercent: 75,
      powerKw: 11,
      cop: 5.2,
      alarm: false,
    },
    {
      id: "CH-02",
      status: "RUNNING",
      capacityKw: 100,
      loadPercent: 75,
      powerKw: 11,
      cop: 5.2,
      alarm: false,
    },
    {
      id: "CH-03",
      status: "RUNNING",
      capacityKw: 100,
      loadPercent: 75,
      powerKw: 11,
      cop: 5.2,
      alarm: false,
    },
    {
      id: "CH-04",
      status: "RUNNING",
      capacityKw: 100,
      loadPercent: 75,
      powerKw: 11,
      cop: 5.2,
      alarm: false,
    },
  ],

  pumps: [
    {
      id: "PCHWP-01",
      status: "RUNNING",
      flowM3h: 120,
      pressureKpa: 250,
      powerKw: 5.5,
      alarm: false,
    },
  ],

  ahus: [
    {
      id: "AHU-01",
      status: "RUNNING",
      airflowCmh: 18000,
      temperatureC: 23,
      setpointC: 23,
      alarm: false,
    },
  ],

  faults: [],

  stopChiller: (id) =>
    set((state) => ({
      chillers: state.chillers.map((c) =>
        c.id === id ? { ...c, status: "STOPPED", alarm: true } : c,
      ),

      faults: [
        ...state.faults,
        {
          id: crypto.randomUUID(),
          equipment: id,
          type: "MANUAL_STOP",
          severity: "WARNING",
          message: `${id} manually stopped. Cooling capacity reduced.`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  startChiller: (id) =>
    set((state) => ({
      chillers: state.chillers.map((c) =>
        c.id === id ? { ...c, status: "RUNNING", alarm: false } : c,
      ),
    })),
}));
