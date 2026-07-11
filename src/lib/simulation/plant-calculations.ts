import type { PlantState } from "@/types/hvac";

export function calculatePlantTotalPower(state: PlantState): number {
  const chillerPower = state.chillers.reduce(
    (total, item) => total + item.powerKw,
    0,
  );

  const ahuPower = state.ahus.reduce((total, item) => total + item.powerKw, 0);

  const chilledWaterPumpPower = state.chilledWaterPumps.reduce(
    (total, item) => total + item.powerKw,
    0,
  );

  const condenserWaterPumpPower = state.condenserWaterPumps.reduce(
    (total, item) => total + item.powerKw,
    0,
  );

  const coolingTowerPower = state.coolingTowers.reduce(
    (total, item) => total + item.powerKw,
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

export function calculateActiveAlarmCount(state: PlantState): number {
  const equipment = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ];

  return equipment.filter((item) => item.alarmLevel !== "normal").length;
}
