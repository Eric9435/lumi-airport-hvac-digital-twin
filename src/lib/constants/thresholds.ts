export const HVAC_THRESHOLDS = {
  chiller: {
    chilledWaterSupplyTempHighC: 8.5,
    chilledWaterSupplyTempCriticalC: 10,
    chilledWaterDeltaTLowC: 3.5,
    condenserLeavingTempHighC: 36,
    condenserLeavingTempCriticalC: 39,
    minimumCop: 3.8,
    highLoadPercent: 90,
  },

  ahu: {
    zoneTempWarningHighC: 26,
    zoneTempCriticalHighC: 28,
    zoneTempWarningLowC: 19,
    airflowLowPercentOfDesign: 85,
    filterDpWarningPa: 180,
    filterDpCriticalPa: 250,
    co2WarningPpm: 1000,
    co2CriticalPpm: 1400,
  },

  pump: {
    lowFlowPercentOfDesign: 80,
    highDifferentialPressureBar: 4,
  },

  coolingTower: {
    approachWarningC: 6,
    approachCriticalC: 8,
    leavingWaterTempHighC: 34,
  },
} as const;
