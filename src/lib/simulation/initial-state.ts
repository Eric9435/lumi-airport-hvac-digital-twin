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
    const running = index === 0;

    return {
      id: configuration.id,
      name: configuration.name,
      equipmentType: "chiller",
      status: running ? "running" : "standby",
      mode: "automatic",
      enabled: true,
      runtimeHours: running ? 1840 : 1200 + index * 125,
      alarmLevel: "normal",
      alarmCode: null,
      lastUpdated: now,
      ratedPowerKw: configuration.ratedPowerKw,
      ratedCoolingCapacityKw: configuration.ratedCoolingCapacityKw,
      loadPercent: running ? 72 : 0,
      powerKw: running ? 7.92 : 0,
      energyKwh: running ? 7.92 : 0,
      chilledWaterSupplyTempC: 7,
      chilledWaterReturnTempC: 12.5,
      chilledWaterDeltaTC: 5.5,
      chilledWaterFlowM3h: running ? 18 : 0,
      condenserWaterEnteringTempC: 29,
      condenserWaterLeavingTempC: running ? 34 : 29,
      condenserWaterFlowM3h: running ? 22 : 0,
      cop: running ? 4.9 : 0,
      compressorRunning: running,
      leadLagOrder: configuration.leadLagOrder,
      startCount: running ? 420 : 300 + index * 20,
    };
  },
);

const ahus: AhuState[] = AHU_CONFIGURATION.map((configuration, index) => {
  const fanSpeedPercent = [65, 70, 68, 62, 50, 60][index] ?? 60;
  const airflowRatio = fanSpeedPercent / 100;

  return {
    id: configuration.id,
    name: configuration.name,
    equipmentType: "ahu",
    status: "running",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2100 + index * 110,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    zoneId: configuration.zoneId,
    zoneName: configuration.zoneName,
    fanSpeedPercent,
    airflowCmh: Math.round(configuration.designAirflowCmh * airflowRatio),
    designAirflowCmh: configuration.designAirflowCmh,
    supplyAirTempC: 13,
    returnAirTempC: 24,
    zoneTempC: 24,
    setpointC: configuration.normalSetpointC,
    coolingValvePercent: 55,
    damperPositionPercent: 70,
    outdoorAirPercent: 20,
    filterDifferentialPressurePa: 110,
    powerKw: Number(
      (configuration.designFanPowerKw * Math.pow(airflowRatio, 3)).toFixed(2),
    ),
    occupancy: Math.round(configuration.designOccupancy * 0.4),
    co2Ppm: 750,
  };
});

const chilledWaterPumps: PumpState[] = [
  {
    id: "CHWP-01",
    name: "Chilled Water Pump 01",
    equipmentType: "chilled-water-pump",
    status: "running",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2400,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-01", "CH-02"],
    speedPercent: 70,
    flowM3h: 18,
    designFlowM3h: 36,
    headM: 22,
    suctionPressureBar: 1.4,
    dischargePressureBar: 3.2,
    differentialPressureBar: 1.8,
    powerKw: 3.1,
    currentA: 6.5,
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
    status: "running",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2300,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    servedEquipmentIds: ["CH-01", "CH-02"],
    speedPercent: 72,
    flowM3h: 22,
    designFlowM3h: 44,
    headM: 19,
    suctionPressureBar: 1.2,
    dischargePressureBar: 2.9,
    differentialPressureBar: 1.7,
    powerKw: 3.3,
    currentA: 6.8,
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
    status: "running",
    mode: "automatic",
    enabled: true,
    runtimeHours: 2250,
    alarmLevel: "normal",
    alarmCode: null,
    lastUpdated: now,
    fanSpeedPercent: 68,
    enteringWaterTempC: 34,
    leavingWaterTempC: 29,
    rangeC: 5,
    approachC: 4,
    waterFlowM3h: 22,
    ambientWetBulbTempC: 25,
    powerKw: 2.1,
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
  simulationRunning: true,
  simulationSpeed: 1,
  operatingMode: "automatic",
  totalPowerKw: calculateTotalPower(),
  totalEnergyKwh: 0,
  activeAlarmCount: 0,
  expectedPassengers: 920,
  chillers,
  ahus,
  chilledWaterPumps,
  condenserWaterPumps,
  coolingTowers,
  flightDemand: {
    date: now.slice(0, 10),
    currentFlights: 3,
    flightsNextHour: 4,
    flightsNextTwoHours: 7,
    expectedPassengers: 920,
    arrivalPassengers: 410,
    departurePassengers: 510,
    demandLevel: "high",
  },
};
