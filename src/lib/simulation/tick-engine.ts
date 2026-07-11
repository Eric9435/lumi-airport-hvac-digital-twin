import { evaluatePlantAlarms } from "@/lib/alarms/alarm-engine";

import { calculateEnergySample } from "@/lib/energy/energy-engine";

import { calculateTotalPlantPower } from "@/lib/simulation/state-helpers";

import type { SimulationTickResult } from "@/types/analytics";

import type { AhuState, ChillerState, PlantState } from "@/types/hvac";

function approachValue(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function updateAhu(ahu: AhuState, passengerDemandFactor: number): AhuState {
  if (ahu.status !== "running") {
    const stoppedZoneTarget = 27 + passengerDemandFactor * 1.5;

    return {
      ...ahu,

      airflowCmh: 0,

      powerKw: 0,

      zoneTempC: round(approachValue(ahu.zoneTempC, stoppedZoneTarget, 0.02)),

      co2Ppm: Math.round(
        approachValue(ahu.co2Ppm, 950 + passengerDemandFactor * 500, 0.02),
      ),

      lastUpdated: new Date().toISOString(),
    };
  }

  const airflowRatio = ahu.fanSpeedPercent / 100;

  const airflowCmh = ahu.designAirflowCmh * airflowRatio;

  const airflowEffect = Math.max(0.35, airflowRatio);

  const occupancyRatio = Math.min(
    1.5,
    ahu.occupancy / Math.max(1, ahu.designAirflowCmh / 30),
  );

  const coolingEffect = (ahu.coolingValvePercent / 100) * airflowEffect;

  const thermalLoad = passengerDemandFactor * 1.8 + occupancyRatio * 0.7;

  const targetZoneTemp = ahu.setpointC + thermalLoad - coolingEffect * 2.1;

  const targetCo2 =
    550 +
    passengerDemandFactor * 280 +
    occupancyRatio * 260 -
    (ahu.outdoorAirPercent / 100) * 220;

  return {
    ...ahu,

    airflowCmh: Math.round(airflowCmh),

    zoneTempC: round(approachValue(ahu.zoneTempC, targetZoneTemp, 0.08)),

    returnAirTempC: round(
      approachValue(ahu.returnAirTempC, targetZoneTemp, 0.05),
    ),

    co2Ppm: Math.max(
      420,
      Math.round(approachValue(ahu.co2Ppm, targetCo2, 0.06)),
    ),

    filterDifferentialPressurePa: round(
      ahu.filterDifferentialPressurePa + airflowRatio * 0.02,
    ),

    lastUpdated: new Date().toISOString(),
  };
}

function updateChiller(
  chiller: ChillerState,
  plantDemandPercent: number,
  runningChillerCount: number,
): ChillerState {
  if (chiller.status !== "running") {
    return {
      ...chiller,

      loadPercent: 0,

      powerKw: 0,

      chilledWaterFlowM3h: 0,

      condenserWaterFlowM3h: 0,

      compressorRunning: false,

      lastUpdated: new Date().toISOString(),
    };
  }

  const sharedLoadPercent = Math.min(
    100,
    Math.max(20, plantDemandPercent / Math.max(1, runningChillerCount)),
  );

  const powerKw =
    chiller.ratedPowerKw * (0.18 + (sharedLoadPercent / 100) * 0.82);

  const chilledWaterSupplyTarget =
    7 + Math.max(0, sharedLoadPercent - 78) * 0.025;

  const chilledWaterReturnTarget = 11.5 + sharedLoadPercent * 0.018;

  const condenserLeavingTarget = 31 + sharedLoadPercent * 0.045;

  const cop = Math.max(
    3.2,
    5.15 -
      sharedLoadPercent * 0.009 -
      Math.max(0, condenserLeavingTarget - 33) * 0.08,
  );

  return {
    ...chiller,

    loadPercent: round(sharedLoadPercent),

    powerKw: round(powerKw),

    energyKwh: round(chiller.energyKwh + powerKw / 3600, 4),

    chilledWaterSupplyTempC: round(
      approachValue(
        chiller.chilledWaterSupplyTempC,
        chilledWaterSupplyTarget,
        0.08,
      ),
    ),

    chilledWaterReturnTempC: round(
      approachValue(
        chiller.chilledWaterReturnTempC,
        chilledWaterReturnTarget,
        0.08,
      ),
    ),

    chilledWaterDeltaTC: round(
      chilledWaterReturnTarget - chilledWaterSupplyTarget,
    ),

    chilledWaterFlowM3h: round(12 + sharedLoadPercent * 0.1),

    condenserWaterLeavingTempC: round(
      approachValue(
        chiller.condenserWaterLeavingTempC,
        condenserLeavingTarget,
        0.08,
      ),
    ),

    condenserWaterFlowM3h: round(15 + sharedLoadPercent * 0.1),

    cop: round(cop),

    compressorRunning: true,

    runtimeHours: round(chiller.runtimeHours + 1 / 3600, 4),

    lastUpdated: new Date().toISOString(),
  };
}

export function runSimulationTick(
  state: PlantState,
  intervalSeconds: number,
): SimulationTickResult {
  const passengerDemandFactor = Math.min(
    1.5,
    Math.max(0.15, state.expectedPassengers / 1200),
  );

  const ahus = state.ahus.map((ahu) => updateAhu(ahu, passengerDemandFactor));

  const totalAhuDemand = ahus.reduce(
    (total, ahu) =>
      total + (ahu.fanSpeedPercent / 100) * (ahu.coolingValvePercent / 100),
    0,
  );

  const plantDemandPercent = Math.min(
    400,
    45 + totalAhuDemand * 52 + passengerDemandFactor * 38,
  );

  const runningChillerCount = state.chillers.filter(
    (chiller) => chiller.status === "running",
  ).length;

  const chillers = state.chillers.map((chiller) =>
    updateChiller(chiller, plantDemandPercent, runningChillerCount),
  );

  const updatedState: PlantState = {
    ...state,

    timestamp: new Date().toISOString(),

    chillers,

    ahus,

    totalEnergyKwh: round(
      state.totalEnergyKwh + state.totalPowerKw * (intervalSeconds / 3600),
      4,
    ),
  };

  updatedState.totalPowerKw = calculateTotalPlantPower(updatedState);

  const alarms = evaluatePlantAlarms(updatedState);

  updatedState.activeAlarmCount = alarms.length;

  const energySample = calculateEnergySample(
    updatedState,
    intervalSeconds,
    updatedState.totalEnergyKwh,
  );

  return {
    state: updatedState,
    energySample,
    alarms,
  };
}
