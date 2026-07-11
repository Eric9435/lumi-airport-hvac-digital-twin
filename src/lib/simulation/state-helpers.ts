import type { AhuState, ChillerState, PlantState } from "@/types/hvac";

export function calculateTotalPlantPower(state: PlantState): number {
  const chillerPower = state.chillers.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const ahuPower = state.ahus.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const chilledWaterPumpPower = state.chilledWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const condenserWaterPumpPower = state.condenserWaterPumps.reduce(
    (total, equipment) => total + equipment.powerKw,
    0,
  );

  const coolingTowerPower = state.coolingTowers.reduce(
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

export function startChillerState(chiller: ChillerState): ChillerState {
  if (chiller.status === "running") {
    return chiller;
  }

  return {
    ...chiller,
    status: "running",
    mode: "manual",
    loadPercent: 65,
    powerKw: Number((chiller.ratedPowerKw * 0.65).toFixed(2)),
    energyKwh: chiller.energyKwh,
    chilledWaterFlowM3h: 18,
    condenserWaterFlowM3h: 22,
    condenserWaterLeavingTempC: 34,
    cop: 4.8,
    compressorRunning: true,
    startCount: chiller.startCount + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function stopChillerState(chiller: ChillerState): ChillerState {
  if (chiller.status !== "running") {
    return chiller;
  }

  return {
    ...chiller,
    status: "standby",
    mode: "manual",
    loadPercent: 0,
    powerKw: 0,
    chilledWaterFlowM3h: 0,
    condenserWaterFlowM3h: 0,
    condenserWaterLeavingTempC: chiller.condenserWaterEnteringTempC,
    cop: 0,
    compressorRunning: false,
    lastUpdated: new Date().toISOString(),
  };
}

export function setAhuFanSpeedState(
  ahu: AhuState,
  requestedSpeed: number,
): AhuState {
  const fanSpeedPercent = Math.min(100, Math.max(0, requestedSpeed));

  const airflowRatio = fanSpeedPercent / 100;

  const currentDesignPower =
    ahu.fanSpeedPercent > 0
      ? ahu.powerKw / Math.pow(ahu.fanSpeedPercent / 100, 3)
      : 8;

  return {
    ...ahu,
    status: fanSpeedPercent > 0 ? "running" : "stopped",
    mode: "manual",
    fanSpeedPercent,
    airflowCmh: Math.round(ahu.designAirflowCmh * airflowRatio),
    powerKw: Number(
      (currentDesignPower * Math.pow(airflowRatio, 3)).toFixed(2),
    ),
    lastUpdated: new Date().toISOString(),
  };
}

export function setAhuSetpointState(
  ahu: AhuState,
  requestedSetpoint: number,
): AhuState {
  return {
    ...ahu,
    mode: "manual",
    setpointC: Math.min(30, Math.max(16, requestedSetpoint)),
    lastUpdated: new Date().toISOString(),
  };
}
