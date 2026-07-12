import {
  AHU_CONFIGURATION,
  CHILLER_CONFIGURATION,
} from "@/lib/constants/equipment";

import type {
  AhuState,
  ChillerState,
  CoolingTowerState,
  PlantState,
  PumpState,
} from "@/types/hvac";

const now = new Date().toISOString();

const chillers: ChillerState[] = CHILLER_CONFIGURATION.map(
  (configuration, index) => {
    return {
      id: configuration.id,
      name: configuration.name,
      equipmentType: "chiller",
      status: "standby",
      mode: "automatic",
      enabled: true,
      runtimeHours: 1200 + index * 125,
      alarmLevel: "normal",
      alarmCode: null,
      lastUpdated: now,
      ratedPowerKw: configuration.ratedPowerKw,
      ratedCoolingCapacityKw: configuration.ratedCoolingCapacityKw,
      loadPercent: 0,
      powerKw: 0,
      energyKwh: 0,
      chilledWaterSupplyTempC: 7,
      chilledWaterReturnTempC: 12.5,
      chilledWaterDeltaTC: 5.5,
      chilledWaterFlowM3h: 0,
      condenserWaterEnteringTempC: 29,
      condenserWaterLeavingTempC: 29,
      condenserWaterFlowM3h: 0,
      cop: 0,
      compressorRunning: false,
      leadLagOrder: configuration.leadLagOrder,
      startCount: 300 + index * 20,
    };
  },
);

const ahus: AhuState[] = AHU_CONFIGURATION.map((configuration, index) => {
  const fanSpeedPercent = [65, 70, 68, 62, 50, 60][index] ?? 60;
  return {
    id: configuration.id,
    name: configuration.name,
    equipmentType: "ahu",
    status: "stopped",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2100 + index * 110,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    zoneId: configuration.zoneId,
    zoneName: configuration.zoneName,
    fanSpeedPercent: 0,
    airflowCmh: 0,
    designAirflowCmh: configuration.designAirflowCmh,
    supplyAirTempC: 13,
    returnAirTempC: 24,
    zoneTempC: 24,
    setpointC: configuration.normalSetpointC,
    coolingValvePercent: 0,
    damperPositionPercent: 70,
    outdoorAirPercent: 20,
    filterDifferentialPressurePa: 110,
    powerKw: 0,
    occupancy: 0,
    co2Ppm: 750,
  };
});

const chilledWaterPumps: PumpState[] = [
  {
    id: "CHWP-01",
    name: "Chilled Water Pump 01",
    equipmentType: "chilled-water-pump",
    status: "stopped",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2400,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-01", "CH-02"],
    speedPercent: 0,
    flowM3h: 0,
    designFlowM3h: 36,
    headM: 0,
    suctionPressureBar: 1.4,
    dischargePressureBar: 1.4,
    differentialPressureBar: 0,
    powerKw: 0,
    currentA: 0,
  },
  {
    id: "CHWP-02",
    name: "Chilled Water Pump 02",
    equipmentType: "chilled-water-pump",
    status: "standby",
    mode: "automatic",
    enabled: true,
    runtimeHours: 1900,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-03", "CH-04"],
    speedPercent: 0,
    flowM3h: 0,
    designFlowM3h: 36,
    headM: 0,
    suctionPressureBar: 1.4,
    dischargePressureBar: 1.4,
    differentialPressureBar: 0,
    powerKw: 0,
    currentA: 0,
  },
];

const condenserWaterPumps: PumpState[] = [
  {
    id: "CWP-01",
    name: "Condenser Water Pump 01",
    equipmentType: "condenser-water-pump",
    status: "stopped",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2300,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-01", "CH-02"],
    speedPercent: 0,
    flowM3h: 0,
    designFlowM3h: 44,
    headM: 0,
    suctionPressureBar: 1.2,
    dischargePressureBar: 1.2,
    differentialPressureBar: 0,
    powerKw: 0,
    currentA: 0,
  },
  {
    id: "CWP-02",
    name: "Condenser Water Pump 02",
    equipmentType: "condenser-water-pump",
    status: "standby",
    mode: "automatic",
    enabled: true,
    runtimeHours: 1800,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-03", "CH-04"],
    speedPercent: 0,
    flowM3h: 0,
    designFlowM3h: 44,
    headM: 0,
    suctionPressureBar: 1.2,
    dischargePressureBar: 1.2,
    differentialPressureBar: 0,
    powerKw: 0,
    currentA: 0,
  },
];

const coolingTowers: CoolingTowerState[] = [
  {
    id: "CT-01",
    name: "Cooling Tower 01",
    equipmentType: "cooling-tower",
    status: "stopped",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2250,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    fanSpeedPercent: 0,
    enteringWaterTempC: 29,
    leavingWaterTempC: 29,
    rangeC: 0,
    approachC: 4,
    waterFlowM3h: 0,
    ambientWetBulbTempC: 25,
    powerKw: 0,
  },
  {
    id: "CT-02",
    name: "Cooling Tower 02",
    equipmentType: "cooling-tower",
    status: "standby",
    mode: "automatic",
    enabled: true,
    runtimeHours: 1750,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    fanSpeedPercent: 0,
    enteringWaterTempC: 29,
    leavingWaterTempC: 29,
    rangeC: 0,
    approachC: 4,
    waterFlowM3h: 0,
    ambientWetBulbTempC: 25,
    powerKw: 0,
  },
];

function calculateTotalPower(): number {
  const chillerPower = chillers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const ahuPower = ahus.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const chilledWaterPumpPower = chilledWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const condenserWaterPumpPower = condenserWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const coolingTowerPower = coolingTowers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  return Number(
    (
      chillerPower +
      ahuPower +
      chilledWaterPumpPower +
      condenserWaterPumpPower +
      coolingTowerPower
    ).toFixed(2),
  );
}

export const initialPlantState: PlantState = {
  timestamp: now,
  simulationRunning: false,
  simulationSpeed: 1,
  operatingMode: "manual",
  totalPowerKw: calculateTotalPower(),
  totalEnergyKwh: 0,
  activeAlarmCount: 0,
  expectedPassengers: 0,
  chillers,
  ahus,
  chilledWaterPumps,
  condenserWaterPumps,
  coolingTowers,
  flightDemand: {
    date: now.slice(0, 10),
    currentFlights: 0,
    flightsNextHour: 0,
    flightsNextTwoHours: 0,
    expectedPassengers: 920,
    arrivalPassengers: 0,
    departurePassengers: 0,
    demandLevel: "low",
  },
};
