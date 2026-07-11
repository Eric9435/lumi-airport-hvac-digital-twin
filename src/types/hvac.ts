export type EquipmentStatus =
  | "running"
  | "standby"
  | "stopped"
  | "starting"
  | "stopping"
  | "warning"
  | "alarm"
  | "maintenance"
  | "offline";

export type OperatingMode =
  "automatic" | "manual" | "eco" | "comfort" | "boost" | "emergency";

export type AlarmLevel =
  "normal" | "information" | "warning" | "high" | "critical";

export interface EquipmentBase {
  id: string;
  name: string;
  status: EquipmentStatus;
  mode: OperatingMode;
  enabled: boolean;
  runtimeHours: number;
  alarmLevel: AlarmLevel;
  alarmCode: string | null;
  lastUpdated: string;
}

export interface ChillerState extends EquipmentBase {
  equipmentType: "chiller";
  ratedPowerKw: number;
  ratedCoolingCapacityKw: number;
  loadPercent: number;
  powerKw: number;
  energyKwh: number;
  chilledWaterSupplyTempC: number;
  chilledWaterReturnTempC: number;
  chilledWaterDeltaTC: number;
  chilledWaterFlowM3h: number;
  condenserWaterEnteringTempC: number;
  condenserWaterLeavingTempC: number;
  condenserWaterFlowM3h: number;
  cop: number;
  compressorRunning: boolean;
  leadLagOrder: number;
  startCount: number;
}

export interface AhuState extends EquipmentBase {
  equipmentType: "ahu";
  zoneId: string;
  zoneName: string;
  fanSpeedPercent: number;
  airflowCmh: number;
  designAirflowCmh: number;
  supplyAirTempC: number;
  returnAirTempC: number;
  zoneTempC: number;
  setpointC: number;
  coolingValvePercent: number;
  damperPositionPercent: number;
  outdoorAirPercent: number;
  filterDifferentialPressurePa: number;
  powerKw: number;
  occupancy: number;
  co2Ppm: number;
}

export interface PumpState extends EquipmentBase {
  equipmentType: "chilled-water-pump" | "condenser-water-pump";
  servedEquipmentIds: string[];
  speedPercent: number;
  flowM3h: number;
  designFlowM3h: number;
  headM: number;
  suctionPressureBar: number;
  dischargePressureBar: number;
  differentialPressureBar: number;
  powerKw: number;
  currentA: number;
}

export interface CoolingTowerState extends EquipmentBase {
  equipmentType: "cooling-tower";
  fanSpeedPercent: number;
  enteringWaterTempC: number;
  leavingWaterTempC: number;
  rangeC: number;
  approachC: number;
  waterFlowM3h: number;
  ambientWetBulbTempC: number;
  powerKw: number;
}

export interface FlightDemandState {
  date: string;
  currentFlights: number;
  flightsNextHour: number;
  flightsNextTwoHours: number;
  expectedPassengers: number;
  arrivalPassengers: number;
  departurePassengers: number;
  demandLevel: "low" | "normal" | "high" | "peak";
}

export interface PlantState {
  timestamp: string;
  simulationRunning: boolean;
  simulationSpeed: number;
  operatingMode: OperatingMode;
  totalPowerKw: number;
  totalEnergyKwh: number;
  activeAlarmCount: number;
  expectedPassengers: number;
  chillers: ChillerState[];
  ahus: AhuState[];
  chilledWaterPumps: PumpState[];
  condenserWaterPumps: PumpState[];
  coolingTowers: CoolingTowerState[];
  flightDemand: FlightDemandState;
}

export type LumiCommand =
  | {
      action: "START_CHILLER";
      equipmentId: string;
    }
  | {
      action: "STOP_CHILLER";
      equipmentId: string;
    }
  | {
      action: "SET_AHU_FAN_SPEED";
      equipmentId: string;
      value: number;
    }
  | {
      action: "SET_AHU_SETPOINT";
      equipmentId: string;
      value: number;
    }
  | {
      action: "START_AHU";
      equipmentId: string;
    }
  | {
      action: "STOP_AHU";
      equipmentId: string;
    }
  | {
      action: "SHOW_PLANT_STATUS";
    }
  | {
      action: "UNKNOWN";
      originalText: string;
    };
