import type {
  CoolingTowerFanState,
  CoolingTowerState,
  EnterprisePlantState,
  EnterprisePumpState,
  StarDeltaStarterState,
  TransformerState,
} from "@/types/enterprise-plant";

const now = new Date().toISOString();

const configuration = {
  tariffMmkPerKwh: 900,
  usableChillerCapacityPercent: 85,
  chillerStageUpThresholdPercent: 80,
  chillerStageDownThresholdPercent: 45,
  chillerStageUpDelaySeconds: 60,
  chillerStageDownDelaySeconds: 180,
  minimumChillerRuntimeSeconds: 1200,
  minimumChillerOffTimeSeconds: 600,
  transformerEnergizeSeconds: 5,
  transformerNoLoadShutdownDelaySeconds: 120,
  primaryPumpPreStartSeconds: 5,
  primaryPumpRunOnSeconds: 60,
  condenserPumpPreStartSeconds: 5,
  condenserPumpRunOnSeconds: 60,
  coolingTowerRunOnSeconds: 60,
  starDurationSeconds: 7,
  starDeltaTransitionSeconds: 0.3,
  coolingTowerFanStageUpDelaySeconds: 30,
  coolingTowerFanStageDownDelaySeconds: 60,
  minimumFanRuntimeSeconds: 300,
  minimumFanOffTimeSeconds: 120,
};

function createTransformer(index: number): TransformerState {
  const id = `TR-${String(index).padStart(2, "0")}`;
  const chillerId = `CH-${String(index).padStart(2, "0")}`;

  return {
    id,
    name: `11 kV Chiller Transformer ${String(index).padStart(2, "0")}`,
    associatedChillerId: chillerId,
    status: "off",
    mode: "automatic",
    primaryVoltageKv: 0,
    secondaryVoltageV: 0,
    ratedCapacityKva: 160,
    activePowerKw: 0,
    apparentPowerKva: 0,
    powerFactor: 0.9,
    loadPercent: 0,
    primaryCurrentA: 0,
    secondaryCurrentA: 0,
    frequencyHz: 50,
    oilTemperatureC: 31,
    windingTemperatureC: 34,
    incomingSupplyAvailable: true,
    incomingBreakerClosed: false,
    lvBreakerClosed: false,
    protectionHealthy: true,
    overcurrentTrip: false,
    earthFaultTrip: false,
    overtemperatureTrip: false,
    maintenanceLockout: false,
    alarmMessage: null,
    ratedPowerKw: 150,
    powerKw: 0,
    runtimeSeconds: 0,
    totalEnergyKwh: 0,
    todayEnergyKwh: 0,
    lastStartedAt: null,
    lastStoppedAt: null,
    startCount: 0,
  };
}

function createStarter(index: number): StarDeltaStarterState {
  const suffix = String(index).padStart(2, "0");

  return {
    id: `SD-CH-${suffix}`,
    associatedChillerId: `CH-${suffix}`,
    status: "stopped",
    mainContactorOn: false,
    starContactorOn: false,
    deltaContactorOn: false,
    overloadHealthy: true,
    phaseFailureHealthy: true,
    phaseSequenceHealthy: true,
    controlVoltageHealthy: true,
    sequenceElapsedSeconds: 0,
    startRequestedAt: null,
    starStartedAt: null,
    transitionStartedAt: null,
    deltaStartedAt: null,
    tripReason: null,
    lastSequenceStep: "Stopped",
  };
}

function createPump(
  category: "primary" | "secondary" | "condenser",
  index: number,
): EnterprisePumpState {
  const prefix =
    category === "primary"
      ? "PCHWP"
      : category === "secondary"
        ? "SCHWP"
        : "CWP";

  const id = `${prefix}-${String(index).padStart(2, "0")}`;
  const associatedChillerId =
    category === "secondary" ? null : `CH-${String(index).padStart(2, "0")}`;

  const ratedPowerKw =
    category === "secondary" ? 5.5 : category === "primary" ? 3.0 : 4.0;

  const designFlowM3h =
    category === "secondary" ? 36 : category === "primary" ? 9 : 12;

  return {
    id,
    name: `${category === "primary" ? "Primary CHW" : category === "secondary" ? "Secondary CHW" : "Condenser Water"} Pump ${String(index).padStart(2, "0")}`,
    category,
    associatedChillerId,
    status: "stopped",
    mode: "automatic",
    dutyRole:
      category === "secondary" ? (index === 1 ? "duty" : "standby") : "duty",
    speedPercent: 0,
    flowM3h: 0,
    designFlowM3h,
    headM: 0,
    differentialPressureBar: 0,
    currentAmpere: 0,
    ratedAmpere: ratedPowerKw * 1.8,
    flowProven: false,
    ratedPowerKw,
    powerKw: 0,
    runtimeSeconds: 0,
    totalEnergyKwh: 0,
    todayEnergyKwh: 0,
    lastStartedAt: null,
    lastStoppedAt: null,
    startCount: 0,
  };
}

function createFan(towerIndex: number, fanIndex: number): CoolingTowerFanState {
  const towerId = `CT-${String(towerIndex).padStart(2, "0")}`;
  const id = `${towerId}-FAN-${String(fanIndex).padStart(2, "0")}`;

  return {
    id,
    towerId,
    status: "stopped",
    speedPercent: 0,
    currentAmpere: 0,
    ratedAmpere: 4.8,
    expectedCurrentAmpere: 0,
    currentLoadPercent: 0,
    beltCondition: "not-evaluated",
    diagnosticMessage: "Fan is stopped; belt condition is not evaluated.",
    minimumRuntimeRemainingSeconds: 0,
    minimumOffTimeRemainingSeconds: 0,
    ratedPowerKw: 2.2,
    powerKw: 0,
    runtimeSeconds: 0,
    totalEnergyKwh: 0,
    todayEnergyKwh: 0,
    lastStartedAt: null,
    lastStoppedAt: null,
    startCount: 0,
  };
}

function createCoolingTower(index: number): CoolingTowerState {
  const id = `CT-${String(index).padStart(2, "0")}`;

  return {
    id,
    name: `Cooling Tower ${String(index).padStart(2, "0")}`,
    role: index === 1 ? "lead" : index === 2 ? "lag" : "standby",
    status: "stopped",
    available: true,
    preferredChillerId: `CH-${String(index).padStart(2, "0")}`,
    ratedHeatRejectionKw: 160,
    currentHeatRejectionKw: 0,
    enteringWaterTemperatureC: 29,
    leavingWaterTemperatureC: 29,
    ambientWetBulbTemperatureC: 25,
    approachTemperatureC: 4,
    runtimeSeconds: 0,
    fans: Array.from({ length: 5 }, (_, fanIndex) =>
      createFan(index, fanIndex + 1),
    ),
    alarmMessage: null,
  };
}

export const initialEnterprisePlantState: EnterprisePlantState = {
  timestamp: now,
  automaticControlEnabled: false,
  sequenceState: "idle",
  currentSequenceId: "SEQ-INITIAL",
  currentSequenceMessage:
    "Plant stopped. Waiting for CSV replay or an explicit operator command.",
  lastCompletedStep: "Safe startup initialized",
  failedSequenceStep: null,

  occupancy: 0,
  outdoorDryBulbTemperatureC: 0,
  outdoorWetBulbTemperatureC: 0,
  predictedCoolingLoadKw: 0,
  coolingDemandPercent: 0,
  requiredChillerCount: 0,

  totalPlantPowerKw: 0,
  totalPlantEnergyKwh: 0,
  todayPlantEnergyKwh: 0,
  totalElectricityCostMmk: 0,
  todayElectricityCostMmk: 0,
  plantRuntimeSeconds: 0,

  transformers: Array.from({ length: 4 }, (_, index) =>
    createTransformer(index + 1),
  ),

  starters: Array.from({ length: 4 }, (_, index) => createStarter(index + 1)),

  primaryPumps: Array.from({ length: 4 }, (_, index) =>
    createPump("primary", index + 1),
  ),

  secondaryPumps: Array.from({ length: 2 }, (_, index) =>
    createPump("secondary", index + 1),
  ),

  condenserPumps: Array.from({ length: 4 }, (_, index) =>
    createPump("condenser", index + 1),
  ),

  coolingTowers: Array.from({ length: 4 }, (_, index) =>
    createCoolingTower(index + 1),
  ),

  groups: Array.from({ length: 4 }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");

    return {
      groupId: `GROUP-${suffix}`,
      chillerId: `CH-${suffix}`,
      transformerId: `TR-${suffix}`,
      primaryPumpId: `PCHWP-${suffix}`,
      condenserPumpId: `CWP-${suffix}`,
      starterId: `SD-CH-${suffix}`,
      selected: false,
      required: false,
      available: true,
      status: "standby" as const,
      currentStep: "Idle",
      lastCompletedStep: "None",
      failedStep: null,
      message: "Available for automatic selection.",
    };
  }),

  sequenceEvents: [],

  coolingTowerRedundancyStatus: "full-redundancy",

  configuration,
};
