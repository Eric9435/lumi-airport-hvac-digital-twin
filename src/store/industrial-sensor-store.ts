import { create } from "zustand";

export interface IndustrialSensorState {
  iaq: {
    co2Ppm: number;
    humidityPercent: number;
    pm25: number;
    airQualityIndex: string;
  };

  pumps: {
    id: string;
    status: string;
    speedPercent: number;
    flowM3h: number;
    differentialPressureKpa: number;
    powerKw: number;
    alarm: boolean;
  }[];

  coolingTower: {
    status: string;
    fanSpeedPercent: number;
    condenserSupplyTempC: number;
    condenserReturnTempC: number;
    alarm: boolean;
  };

  chillers: {
    id: string;
    cop: number;
    compressorCurrentA: number;
    vibration: string;
    bearingTemperatureC: number;
  }[];
}

export const useIndustrialSensorStore = create<IndustrialSensorState>(() => ({
  iaq: {
    co2Ppm: 720,
    humidityPercent: 55,
    pm25: 12,
    airQualityIndex: "GOOD",
  },

  pumps: [
    {
      id: "PCHWP-01",
      status: "RUNNING",
      speedPercent: 75,
      flowM3h: 120,
      differentialPressureKpa: 250,
      powerKw: 5.5,
      alarm: false,
    },
  ],

  coolingTower: {
    status: "RUNNING",
    fanSpeedPercent: 80,
    condenserSupplyTempC: 32,
    condenserReturnTempC: 27,
    alarm: false,
  },

  chillers: [
    {
      id: "CH-01",
      cop: 5.2,
      compressorCurrentA: 85,
      vibration: "NORMAL",
      bearingTemperatureC: 65,
    },
  ],
}));
