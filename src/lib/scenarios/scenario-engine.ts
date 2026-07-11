import type { AhuState, ChillerState, PlantState } from "@/types/hvac";

import type { SimulationScenario } from "@/types/operations";

function cloneState(state: PlantState): PlantState {
  return structuredClone(state);
}

function updateAhuForScenario(
  ahu: AhuState,
  scenario: SimulationScenario,
): AhuState {
  const affected = scenario.affectedEquipmentIds.includes(ahu.id);

  if (scenario.injectedFaultCode === "FILTER_DP_HIGH" && affected) {
    return {
      ...ahu,
      status: "warning",
      alarmLevel: "high",
      alarmCode: "FILTER_DP_HIGH",
      filterDifferentialPressurePa: 285,
      airflowCmh: Math.round(ahu.designAirflowCmh * 0.68),
      zoneTempC: Math.max(ahu.zoneTempC, 26.8),
      lastUpdated: new Date().toISOString(),
    };
  }

  if (scenario.targetOperatingMode === "boost" && affected) {
    return {
      ...ahu,
      mode: "boost",
      status: "running",
      fanSpeedPercent: Math.min(95, Math.max(ahu.fanSpeedPercent, 82)),
      coolingValvePercent: Math.min(100, Math.max(ahu.coolingValvePercent, 80)),
      occupancy: Math.round(ahu.occupancy * scenario.passengerMultiplier),
      lastUpdated: new Date().toISOString(),
    };
  }

  if (scenario.targetOperatingMode === "eco" && affected) {
    return {
      ...ahu,
      mode: "eco",
      fanSpeedPercent: Math.max(40, ahu.fanSpeedPercent - 15),
      setpointC: Math.min(25, ahu.setpointC + 1.5),
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    ...ahu,
    occupancy: Math.round(ahu.occupancy * scenario.passengerMultiplier),
    lastUpdated: new Date().toISOString(),
  };
}

function updateChillerForScenario(
  chiller: ChillerState,
  scenario: SimulationScenario,
): ChillerState {
  const affected = scenario.affectedEquipmentIds.includes(chiller.id);

  if (scenario.injectedFaultCode === "CHILLER_TRIP" && affected) {
    return {
      ...chiller,
      status: "alarm",
      alarmLevel: "critical",
      alarmCode: "CHILLER_TRIP",
      loadPercent: 0,
      powerKw: 0,
      chilledWaterFlowM3h: 0,
      condenserWaterFlowM3h: 0,
      cop: 0,
      compressorRunning: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    ...chiller,
    mode: scenario.targetOperatingMode,
    lastUpdated: new Date().toISOString(),
  };
}

export function applyScenario(
  currentState: PlantState,
  scenario: SimulationScenario,
): PlantState {
  const state = cloneState(currentState);

  state.timestamp = new Date().toISOString();

  state.operatingMode = scenario.targetOperatingMode;

  state.expectedPassengers = Math.round(
    currentState.expectedPassengers * scenario.passengerMultiplier,
  );

  state.flightDemand = {
    ...state.flightDemand,
    expectedPassengers: state.expectedPassengers,
    demandLevel:
      scenario.passengerMultiplier >= 1.5
        ? "peak"
        : scenario.passengerMultiplier >= 1.2
          ? "high"
          : scenario.passengerMultiplier < 0.8
            ? "low"
            : "normal",
  };

  state.chillers = state.chillers.map((chiller) =>
    updateChillerForScenario(chiller, scenario),
  );

  state.ahus = state.ahus.map((ahu) => updateAhuForScenario(ahu, scenario));

  state.activeAlarmCount = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ].filter((equipment) => equipment.alarmLevel !== "normal").length;

  return state;
}
