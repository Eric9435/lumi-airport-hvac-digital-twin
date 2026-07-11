import { HVAC_THRESHOLDS } from "@/lib/constants/thresholds";

import type { ActiveAlarm } from "@/types/analytics";

import type { PlantState } from "@/types/hvac";

function createAlarmId(equipmentId: string, alarmCode: string): string {
  return `${equipmentId}-${alarmCode}`;
}

export function evaluatePlantAlarms(state: PlantState): ActiveAlarm[] {
  const alarms: ActiveAlarm[] = [];

  for (const chiller of state.chillers) {
    if (
      chiller.status === "running" &&
      chiller.chilledWaterSupplyTempC >=
        HVAC_THRESHOLDS.chiller.chilledWaterSupplyTempCriticalC
    ) {
      alarms.push({
        alarmId: createAlarmId(chiller.id, "CHWS_TEMP_CRITICAL"),

        equipmentId: chiller.id,

        equipmentName: chiller.name,

        zoneId: null,

        alarmCode: "CHWS_TEMP_CRITICAL",

        alarmLevel: "critical",

        message: "Chilled-water supply temperature is critically high.",

        probableCause:
          "Insufficient cooling capacity, low refrigerant performance, condenser issue, or excessive load.",

        recommendedAction:
          "Check active chiller staging, chilled-water flow, condenser-water temperature and compressor operation.",

        measuredValue: chiller.chilledWaterSupplyTempC,

        thresholdValue: HVAC_THRESHOLDS.chiller.chilledWaterSupplyTempCriticalC,

        unit: "°C",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      chiller.status === "running" &&
      chiller.chilledWaterSupplyTempC >=
        HVAC_THRESHOLDS.chiller.chilledWaterSupplyTempHighC
    ) {
      alarms.push({
        alarmId: createAlarmId(chiller.id, "CHWS_TEMP_HIGH"),

        equipmentId: chiller.id,

        equipmentName: chiller.name,

        zoneId: null,

        alarmCode: "CHWS_TEMP_HIGH",

        alarmLevel: "warning",

        message: "Chilled-water supply temperature is above the normal range.",

        probableCause:
          "High cooling demand, reduced water flow, or degraded chiller performance.",

        recommendedAction:
          "Review plant load and consider staging another available chiller.",

        measuredValue: chiller.chilledWaterSupplyTempC,

        thresholdValue: HVAC_THRESHOLDS.chiller.chilledWaterSupplyTempHighC,

        unit: "°C",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (
      chiller.status === "running" &&
      chiller.cop > 0 &&
      chiller.cop < HVAC_THRESHOLDS.chiller.minimumCop
    ) {
      alarms.push({
        alarmId: createAlarmId(chiller.id, "COP_LOW"),

        equipmentId: chiller.id,

        equipmentName: chiller.name,

        zoneId: null,

        alarmCode: "COP_LOW",

        alarmLevel: "warning",

        message:
          "Chiller coefficient of performance is below the expected range.",

        probableCause:
          "Condenser fouling, high condenser-water temperature, low evaporator flow, or compressor efficiency degradation.",

        recommendedAction:
          "Compare current operating data with design values and inspect condenser and evaporator conditions.",

        measuredValue: chiller.cop,

        thresholdValue: HVAC_THRESHOLDS.chiller.minimumCop,

        unit: "COP",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    }
  }

  for (const ahu of state.ahus) {
    if (ahu.zoneTempC >= HVAC_THRESHOLDS.ahu.zoneTempCriticalHighC) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "ZONE_TEMP_CRITICAL"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "ZONE_TEMP_CRITICAL",

        alarmLevel: "critical",

        message: "Zone temperature is critically high.",

        probableCause:
          "AHU airflow is insufficient, cooling valve is restricted, chilled-water supply is inadequate, or occupancy is above design.",

        recommendedAction:
          "Increase airflow, verify cooling-valve position and check chilled-water availability.",

        measuredValue: ahu.zoneTempC,

        thresholdValue: HVAC_THRESHOLDS.ahu.zoneTempCriticalHighC,

        unit: "°C",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    } else if (ahu.zoneTempC >= HVAC_THRESHOLDS.ahu.zoneTempWarningHighC) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "ZONE_TEMP_HIGH"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "ZONE_TEMP_HIGH",

        alarmLevel: "warning",

        message: "Zone temperature is above the comfort range.",

        probableCause:
          "Increased passenger load, reduced airflow or insufficient cooling-valve opening.",

        recommendedAction:
          "Review occupancy demand and increase fan speed or cooling-valve position if appropriate.",

        measuredValue: ahu.zoneTempC,

        thresholdValue: HVAC_THRESHOLDS.ahu.zoneTempWarningHighC,

        unit: "°C",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (
      ahu.filterDifferentialPressurePa >= HVAC_THRESHOLDS.ahu.filterDpCriticalPa
    ) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "FILTER_DP_CRITICAL"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "FILTER_DP_CRITICAL",

        alarmLevel: "high",

        message: "AHU filter differential pressure is critically high.",

        probableCause: "Filter blockage or severe airflow restriction.",

        recommendedAction: "Inspect and replace the filter immediately.",

        measuredValue: ahu.filterDifferentialPressurePa,

        thresholdValue: HVAC_THRESHOLDS.ahu.filterDpCriticalPa,

        unit: "Pa",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      ahu.filterDifferentialPressurePa >= HVAC_THRESHOLDS.ahu.filterDpWarningPa
    ) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "FILTER_DP_HIGH"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "FILTER_DP_HIGH",

        alarmLevel: "warning",

        message: "AHU filter differential pressure is above the normal range.",

        probableCause: "Filter loading or partial airflow obstruction.",

        recommendedAction:
          "Schedule a filter inspection and review airflow performance.",

        measuredValue: ahu.filterDifferentialPressurePa,

        thresholdValue: HVAC_THRESHOLDS.ahu.filterDpWarningPa,

        unit: "Pa",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (ahu.co2Ppm >= HVAC_THRESHOLDS.ahu.co2CriticalPpm) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "CO2_CRITICAL"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "CO2_CRITICAL",

        alarmLevel: "critical",

        message: "Zone carbon-dioxide concentration is critically high.",

        probableCause:
          "Outdoor-air ventilation is insufficient for the current occupancy.",

        recommendedAction:
          "Increase outdoor-air damper position and verify ventilation equipment operation.",

        measuredValue: ahu.co2Ppm,

        thresholdValue: HVAC_THRESHOLDS.ahu.co2CriticalPpm,

        unit: "ppm",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    } else if (ahu.co2Ppm >= HVAC_THRESHOLDS.ahu.co2WarningPpm) {
      alarms.push({
        alarmId: createAlarmId(ahu.id, "CO2_HIGH"),

        equipmentId: ahu.id,

        equipmentName: ahu.name,

        zoneId: ahu.zoneId,

        alarmCode: "CO2_HIGH",

        alarmLevel: "warning",

        message:
          "Zone carbon-dioxide concentration is above the normal ventilation target.",

        probableCause: "High occupancy or inadequate outdoor-air supply.",

        recommendedAction:
          "Increase outdoor-air percentage and inspect damper operation.",

        measuredValue: ahu.co2Ppm,

        thresholdValue: HVAC_THRESHOLDS.ahu.co2WarningPpm,

        unit: "ppm",

        detectedAt: new Date().toISOString(),

        acknowledged: false,
      });
    }
  }

  return alarms;
}
