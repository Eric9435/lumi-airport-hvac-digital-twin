import type { AlarmLevel, PlantState } from "@/types/hvac";

export interface EnergySample {
  timestamp: string;
  totalPowerKw: number;
  chillerPowerKw: number;
  ahuPowerKw: number;
  pumpPowerKw: number;
  coolingTowerPowerKw: number;
  intervalEnergyKwh: number;
  cumulativeEnergyKwh: number;
  expectedPassengers: number;
}

export interface EnergySummary {
  currentPowerKw: number;
  totalEnergyKwh: number;
  peakPowerKw: number;
  averagePowerKw: number;
  estimatedBaselineKwh: number;
  estimatedSavingKwh: number;
  estimatedSavingPercent: number;
  estimatedCarbonKg: number;
}

export interface ActiveAlarm {
  alarmId: string;
  equipmentId: string;
  equipmentName: string;
  zoneId: string | null;
  alarmCode: string;
  alarmLevel: AlarmLevel;
  message: string;
  probableCause: string;
  recommendedAction: string;
  measuredValue: number;
  thresholdValue: number;
  unit: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface SimulationTickResult {
  state: PlantState;
  energySample: EnergySample;
  alarms: ActiveAlarm[];
}
