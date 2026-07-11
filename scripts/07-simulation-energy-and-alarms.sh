#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 7 FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json was not found." >&2
  exit 1
fi

if [[ ! -f src/types/hvac.ts ]]; then
  echo "ERROR: HVAC domain model was not found." >&2
  exit 1
fi

if [[ ! -f src/store/simulation-store.ts ]]; then
  echo "ERROR: Simulation store was not found." >&2
  exit 1
fi

if [[ ! -f src/components/dashboard/plant-dashboard.tsx ]]; then
  echo "ERROR: Plant dashboard was not found." >&2
  exit 1
fi

echo "============================================================"
echo "PART 7 — SIMULATION, ENERGY AND ALARM MANAGEMENT"
echo "============================================================"

mkdir -p \
  src/types \
  src/lib/simulation \
  src/lib/alarms \
  src/lib/energy \
  src/hooks \
  src/components/energy \
  src/components/alarms \
  src/app/api/simulation/tick \
  src/app/api/alarms \
  src/app/api/alarms/evaluate \
  src/app/api/energy \
  src/app/api/energy/summary

echo "Creating analytics and alarm types..."

cat > src/types/analytics.ts <<'EOF'
import type {
  AlarmLevel,
  PlantState,
} from "@/types/hvac";

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
EOF

echo "Creating energy calculation engine..."

cat > src/lib/energy/energy-engine.ts <<'EOF'
import type {
  EnergySample,
  EnergySummary,
} from "@/types/analytics";

import type {
  PlantState,
} from "@/types/hvac";

function round(
  value: number,
  decimals = 2,
): number {
  const factor = 10 ** decimals;

  return (
    Math.round(value * factor) /
    factor
  );
}

export function calculateEnergySample(
  state: PlantState,
  intervalSeconds: number,
  previousCumulativeEnergyKwh: number,
): EnergySample {
  const chillerPowerKw =
    state.chillers.reduce(
      (total, equipment) =>
        total + equipment.powerKw,
      0,
    );

  const ahuPowerKw =
    state.ahus.reduce(
      (total, equipment) =>
        total + equipment.powerKw,
      0,
    );

  const chilledWaterPumpPower =
    state.chilledWaterPumps.reduce(
      (total, equipment) =>
        total + equipment.powerKw,
      0,
    );

  const condenserWaterPumpPower =
    state.condenserWaterPumps.reduce(
      (total, equipment) =>
        total + equipment.powerKw,
      0,
    );

  const pumpPowerKw =
    chilledWaterPumpPower +
    condenserWaterPumpPower;

  const coolingTowerPowerKw =
    state.coolingTowers.reduce(
      (total, equipment) =>
        total + equipment.powerKw,
      0,
    );

  const totalPowerKw =
    chillerPowerKw +
    ahuPowerKw +
    pumpPowerKw +
    coolingTowerPowerKw;

  const intervalEnergyKwh =
    totalPowerKw *
    (intervalSeconds / 3600);

  return {
    timestamp:
      new Date().toISOString(),

    totalPowerKw:
      round(totalPowerKw),

    chillerPowerKw:
      round(chillerPowerKw),

    ahuPowerKw:
      round(ahuPowerKw),

    pumpPowerKw:
      round(pumpPowerKw),

    coolingTowerPowerKw:
      round(coolingTowerPowerKw),

    intervalEnergyKwh:
      round(intervalEnergyKwh, 4),

    cumulativeEnergyKwh:
      round(
        previousCumulativeEnergyKwh +
          intervalEnergyKwh,
        4,
      ),

    expectedPassengers:
      state.expectedPassengers,
  };
}

export function calculateEnergySummary(
  samples: EnergySample[],
): EnergySummary {
  if (samples.length === 0) {
    return {
      currentPowerKw: 0,
      totalEnergyKwh: 0,
      peakPowerKw: 0,
      averagePowerKw: 0,
      estimatedBaselineKwh: 0,
      estimatedSavingKwh: 0,
      estimatedSavingPercent: 0,
      estimatedCarbonKg: 0,
    };
  }

  const current =
    samples[samples.length - 1];

  const peakPowerKw =
    Math.max(
      ...samples.map(
        (sample) =>
          sample.totalPowerKw,
      ),
    );

  const averagePowerKw =
    samples.reduce(
      (total, sample) =>
        total +
        sample.totalPowerKw,
      0,
    ) / samples.length;

  const totalEnergyKwh =
    current.cumulativeEnergyKwh;

  const estimatedBaselineKwh =
    totalEnergyKwh * 1.12;

  const estimatedSavingKwh =
    estimatedBaselineKwh -
    totalEnergyKwh;

  const estimatedSavingPercent =
    estimatedBaselineKwh > 0
      ? (
          estimatedSavingKwh /
          estimatedBaselineKwh
        ) * 100
      : 0;

  const carbonFactorKgPerKwh =
    0.45;

  return {
    currentPowerKw:
      round(current.totalPowerKw),

    totalEnergyKwh:
      round(totalEnergyKwh),

    peakPowerKw:
      round(peakPowerKw),

    averagePowerKw:
      round(averagePowerKw),

    estimatedBaselineKwh:
      round(estimatedBaselineKwh),

    estimatedSavingKwh:
      round(estimatedSavingKwh),

    estimatedSavingPercent:
      round(
        estimatedSavingPercent,
      ),

    estimatedCarbonKg:
      round(
        totalEnergyKwh *
          carbonFactorKgPerKwh,
      ),
  };
}
EOF

echo "Creating alarm evaluation engine..."

cat > src/lib/alarms/alarm-engine.ts <<'EOF'
import {
  HVAC_THRESHOLDS,
} from "@/lib/constants/thresholds";

import type {
  ActiveAlarm,
} from "@/types/analytics";

import type {
  PlantState,
} from "@/types/hvac";

function createAlarmId(
  equipmentId: string,
  alarmCode: string,
): string {
  return `${equipmentId}-${alarmCode}`;
}

export function evaluatePlantAlarms(
  state: PlantState,
): ActiveAlarm[] {
  const alarms: ActiveAlarm[] = [];

  for (
    const chiller of
    state.chillers
  ) {
    if (
      chiller.status === "running" &&
      chiller.chilledWaterSupplyTempC >=
        HVAC_THRESHOLDS.chiller
          .chilledWaterSupplyTempCriticalC
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            chiller.id,
            "CHWS_TEMP_CRITICAL",
          ),

        equipmentId:
          chiller.id,

        equipmentName:
          chiller.name,

        zoneId: null,

        alarmCode:
          "CHWS_TEMP_CRITICAL",

        alarmLevel:
          "critical",

        message:
          "Chilled-water supply temperature is critically high.",

        probableCause:
          "Insufficient cooling capacity, low refrigerant performance, condenser issue, or excessive load.",

        recommendedAction:
          "Check active chiller staging, chilled-water flow, condenser-water temperature and compressor operation.",

        measuredValue:
          chiller.chilledWaterSupplyTempC,

        thresholdValue:
          HVAC_THRESHOLDS.chiller
            .chilledWaterSupplyTempCriticalC,

        unit: "°C",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      chiller.status === "running" &&
      chiller.chilledWaterSupplyTempC >=
        HVAC_THRESHOLDS.chiller
          .chilledWaterSupplyTempHighC
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            chiller.id,
            "CHWS_TEMP_HIGH",
          ),

        equipmentId:
          chiller.id,

        equipmentName:
          chiller.name,

        zoneId: null,

        alarmCode:
          "CHWS_TEMP_HIGH",

        alarmLevel:
          "warning",

        message:
          "Chilled-water supply temperature is above the normal range.",

        probableCause:
          "High cooling demand, reduced water flow, or degraded chiller performance.",

        recommendedAction:
          "Review plant load and consider staging another available chiller.",

        measuredValue:
          chiller.chilledWaterSupplyTempC,

        thresholdValue:
          HVAC_THRESHOLDS.chiller
            .chilledWaterSupplyTempHighC,

        unit: "°C",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (
      chiller.status === "running" &&
      chiller.cop > 0 &&
      chiller.cop <
        HVAC_THRESHOLDS.chiller
          .minimumCop
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            chiller.id,
            "COP_LOW",
          ),

        equipmentId:
          chiller.id,

        equipmentName:
          chiller.name,

        zoneId: null,

        alarmCode:
          "COP_LOW",

        alarmLevel:
          "warning",

        message:
          "Chiller coefficient of performance is below the expected range.",

        probableCause:
          "Condenser fouling, high condenser-water temperature, low evaporator flow, or compressor efficiency degradation.",

        recommendedAction:
          "Compare current operating data with design values and inspect condenser and evaporator conditions.",

        measuredValue:
          chiller.cop,

        thresholdValue:
          HVAC_THRESHOLDS.chiller
            .minimumCop,

        unit: "COP",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    }
  }

  for (const ahu of state.ahus) {
    if (
      ahu.zoneTempC >=
      HVAC_THRESHOLDS.ahu
        .zoneTempCriticalHighC
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "ZONE_TEMP_CRITICAL",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "ZONE_TEMP_CRITICAL",

        alarmLevel:
          "critical",

        message:
          "Zone temperature is critically high.",

        probableCause:
          "AHU airflow is insufficient, cooling valve is restricted, chilled-water supply is inadequate, or occupancy is above design.",

        recommendedAction:
          "Increase airflow, verify cooling-valve position and check chilled-water availability.",

        measuredValue:
          ahu.zoneTempC,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .zoneTempCriticalHighC,

        unit: "°C",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      ahu.zoneTempC >=
      HVAC_THRESHOLDS.ahu
        .zoneTempWarningHighC
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "ZONE_TEMP_HIGH",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "ZONE_TEMP_HIGH",

        alarmLevel:
          "warning",

        message:
          "Zone temperature is above the comfort range.",

        probableCause:
          "Increased passenger load, reduced airflow or insufficient cooling-valve opening.",

        recommendedAction:
          "Review occupancy demand and increase fan speed or cooling-valve position if appropriate.",

        measuredValue:
          ahu.zoneTempC,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .zoneTempWarningHighC,

        unit: "°C",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (
      ahu.filterDifferentialPressurePa >=
      HVAC_THRESHOLDS.ahu
        .filterDpCriticalPa
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "FILTER_DP_CRITICAL",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "FILTER_DP_CRITICAL",

        alarmLevel:
          "high",

        message:
          "AHU filter differential pressure is critically high.",

        probableCause:
          "Filter blockage or severe airflow restriction.",

        recommendedAction:
          "Inspect and replace the filter immediately.",

        measuredValue:
          ahu.filterDifferentialPressurePa,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .filterDpCriticalPa,

        unit: "Pa",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      ahu.filterDifferentialPressurePa >=
      HVAC_THRESHOLDS.ahu
        .filterDpWarningPa
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "FILTER_DP_HIGH",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "FILTER_DP_HIGH",

        alarmLevel:
          "warning",

        message:
          "AHU filter differential pressure is above the normal range.",

        probableCause:
          "Filter loading or partial airflow obstruction.",

        recommendedAction:
          "Schedule a filter inspection and review airflow performance.",

        measuredValue:
          ahu.filterDifferentialPressurePa,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .filterDpWarningPa,

        unit: "Pa",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    }

    if (
      ahu.co2Ppm >=
      HVAC_THRESHOLDS.ahu
        .co2CriticalPpm
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "CO2_CRITICAL",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "CO2_CRITICAL",

        alarmLevel:
          "critical",

        message:
          "Zone carbon-dioxide concentration is critically high.",

        probableCause:
          "Outdoor-air ventilation is insufficient for the current occupancy.",

        recommendedAction:
          "Increase outdoor-air damper position and verify ventilation equipment operation.",

        measuredValue:
          ahu.co2Ppm,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .co2CriticalPpm,

        unit: "ppm",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    } else if (
      ahu.co2Ppm >=
      HVAC_THRESHOLDS.ahu
        .co2WarningPpm
    ) {
      alarms.push({
        alarmId:
          createAlarmId(
            ahu.id,
            "CO2_HIGH",
          ),

        equipmentId:
          ahu.id,

        equipmentName:
          ahu.name,

        zoneId:
          ahu.zoneId,

        alarmCode:
          "CO2_HIGH",

        alarmLevel:
          "warning",

        message:
          "Zone carbon-dioxide concentration is above the normal ventilation target.",

        probableCause:
          "High occupancy or inadequate outdoor-air supply.",

        recommendedAction:
          "Increase outdoor-air percentage and inspect damper operation.",

        measuredValue:
          ahu.co2Ppm,

        thresholdValue:
          HVAC_THRESHOLDS.ahu
            .co2WarningPpm,

        unit: "ppm",

        detectedAt:
          new Date().toISOString(),

        acknowledged: false,
      });
    }
  }

  return alarms;
}
EOF

echo "Creating simulation tick engine..."

cat > src/lib/simulation/tick-engine.ts <<'EOF'
import {
  evaluatePlantAlarms,
} from "@/lib/alarms/alarm-engine";

import {
  calculateEnergySample,
} from "@/lib/energy/energy-engine";

import {
  calculateTotalPlantPower,
} from "@/lib/simulation/state-helpers";

import type {
  SimulationTickResult,
} from "@/types/analytics";

import type {
  AhuState,
  ChillerState,
  PlantState,
} from "@/types/hvac";

function approachValue(
  current: number,
  target: number,
  rate: number,
): number {
  return (
    current +
    (target - current) * rate
  );
}

function round(
  value: number,
  decimals = 2,
): number {
  const factor = 10 ** decimals;

  return (
    Math.round(value * factor) /
    factor
  );
}

function updateAhu(
  ahu: AhuState,
  passengerDemandFactor: number,
): AhuState {
  if (ahu.status !== "running") {
    const stoppedZoneTarget =
      27 +
      passengerDemandFactor * 1.5;

    return {
      ...ahu,

      airflowCmh: 0,

      powerKw: 0,

      zoneTempC:
        round(
          approachValue(
            ahu.zoneTempC,
            stoppedZoneTarget,
            0.02,
          ),
        ),

      co2Ppm:
        Math.round(
          approachValue(
            ahu.co2Ppm,
            950 +
              passengerDemandFactor *
                500,
            0.02,
          ),
        ),

      lastUpdated:
        new Date().toISOString(),
    };
  }

  const airflowRatio =
    ahu.fanSpeedPercent / 100;

  const airflowCmh =
    ahu.designAirflowCmh *
    airflowRatio;

  const airflowEffect =
    Math.max(
      0.35,
      airflowRatio,
    );

  const occupancyRatio =
    Math.min(
      1.5,
      ahu.occupancy /
        Math.max(
          1,
          ahu.designAirflowCmh /
            30,
        ),
    );

  const coolingEffect =
    (
      ahu.coolingValvePercent /
      100
    ) *
    airflowEffect;

  const thermalLoad =
    passengerDemandFactor *
      1.8 +
    occupancyRatio *
      0.7;

  const targetZoneTemp =
    ahu.setpointC +
    thermalLoad -
    coolingEffect * 2.1;

  const targetCo2 =
    550 +
    passengerDemandFactor *
      280 +
    occupancyRatio *
      260 -
    (
      ahu.outdoorAirPercent /
      100
    ) *
      220;

  return {
    ...ahu,

    airflowCmh:
      Math.round(airflowCmh),

    zoneTempC:
      round(
        approachValue(
          ahu.zoneTempC,
          targetZoneTemp,
          0.08,
        ),
      ),

    returnAirTempC:
      round(
        approachValue(
          ahu.returnAirTempC,
          targetZoneTemp,
          0.05,
        ),
      ),

    co2Ppm:
      Math.max(
        420,
        Math.round(
          approachValue(
            ahu.co2Ppm,
            targetCo2,
            0.06,
          ),
        ),
      ),

    filterDifferentialPressurePa:
      round(
        ahu.filterDifferentialPressurePa +
          airflowRatio * 0.02,
      ),

    lastUpdated:
      new Date().toISOString(),
  };
}

function updateChiller(
  chiller: ChillerState,
  plantDemandPercent: number,
  runningChillerCount: number,
): ChillerState {
  if (
    chiller.status !== "running"
  ) {
    return {
      ...chiller,

      loadPercent: 0,

      powerKw: 0,

      chilledWaterFlowM3h: 0,

      condenserWaterFlowM3h: 0,

      compressorRunning: false,

      lastUpdated:
        new Date().toISOString(),
    };
  }

  const sharedLoadPercent =
    Math.min(
      100,
      Math.max(
        20,
        plantDemandPercent /
          Math.max(
            1,
            runningChillerCount,
          ),
      ),
    );

  const powerKw =
    chiller.ratedPowerKw *
    (
      0.18 +
      sharedLoadPercent /
        100 *
        0.82
    );

  const chilledWaterSupplyTarget =
    7 +
    Math.max(
      0,
      sharedLoadPercent - 78,
    ) *
      0.025;

  const chilledWaterReturnTarget =
    11.5 +
    sharedLoadPercent *
      0.018;

  const condenserLeavingTarget =
    31 +
    sharedLoadPercent *
      0.045;

  const cop =
    Math.max(
      3.2,
      5.15 -
        sharedLoadPercent *
          0.009 -
        Math.max(
          0,
          condenserLeavingTarget -
            33,
        ) *
          0.08,
    );

  return {
    ...chiller,

    loadPercent:
      round(sharedLoadPercent),

    powerKw:
      round(powerKw),

    energyKwh:
      round(
        chiller.energyKwh +
          powerKw / 3600,
        4,
      ),

    chilledWaterSupplyTempC:
      round(
        approachValue(
          chiller
            .chilledWaterSupplyTempC,
          chilledWaterSupplyTarget,
          0.08,
        ),
      ),

    chilledWaterReturnTempC:
      round(
        approachValue(
          chiller
            .chilledWaterReturnTempC,
          chilledWaterReturnTarget,
          0.08,
        ),
      ),

    chilledWaterDeltaTC:
      round(
        chilledWaterReturnTarget -
          chilledWaterSupplyTarget,
      ),

    chilledWaterFlowM3h:
      round(
        12 +
          sharedLoadPercent *
            0.1,
      ),

    condenserWaterLeavingTempC:
      round(
        approachValue(
          chiller
            .condenserWaterLeavingTempC,
          condenserLeavingTarget,
          0.08,
        ),
      ),

    condenserWaterFlowM3h:
      round(
        15 +
          sharedLoadPercent *
            0.1,
      ),

    cop:
      round(cop),

    compressorRunning: true,

    runtimeHours:
      round(
        chiller.runtimeHours +
          1 / 3600,
        4,
      ),

    lastUpdated:
      new Date().toISOString(),
  };
}

export function runSimulationTick(
  state: PlantState,
  intervalSeconds: number,
): SimulationTickResult {
  const passengerDemandFactor =
    Math.min(
      1.5,
      Math.max(
        0.15,
        state.expectedPassengers /
          1200,
      ),
    );

  const ahus =
    state.ahus.map((ahu) =>
      updateAhu(
        ahu,
        passengerDemandFactor,
      ),
    );

  const totalAhuDemand =
    ahus.reduce(
      (total, ahu) =>
        total +
        (
          ahu.fanSpeedPercent /
          100
        ) *
          (
            ahu.coolingValvePercent /
            100
          ),
      0,
    );

  const plantDemandPercent =
    Math.min(
      400,
      45 +
        totalAhuDemand * 52 +
        passengerDemandFactor *
          38,
    );

  const runningChillerCount =
    state.chillers.filter(
      (chiller) =>
        chiller.status ===
        "running",
    ).length;

  const chillers =
    state.chillers.map(
      (chiller) =>
        updateChiller(
          chiller,
          plantDemandPercent,
          runningChillerCount,
        ),
    );

  const updatedState: PlantState = {
    ...state,

    timestamp:
      new Date().toISOString(),

    chillers,

    ahus,

    totalEnergyKwh:
      round(
        state.totalEnergyKwh +
          state.totalPowerKw *
            (
              intervalSeconds /
              3600
            ),
        4,
      ),
  };

  updatedState.totalPowerKw =
    calculateTotalPlantPower(
      updatedState,
    );

  const alarms =
    evaluatePlantAlarms(
      updatedState,
    );

  updatedState.activeAlarmCount =
    alarms.length;

  const energySample =
    calculateEnergySample(
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
EOF

echo "Creating simulation API..."

cat > src/app/api/simulation/tick/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  runSimulationTick,
} from "@/lib/simulation/tick-engine";

import type {
  PlantState,
} from "@/types/hvac";

const tickRequestSchema =
  z.object({
    state: z.unknown(),
    intervalSeconds:
      z
        .number()
        .positive()
        .max(60)
        .default(1),
  });

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      tickRequestSchema.parse(
        await request.json(),
      );

    const result =
      runSimulationTick(
        body.state as PlantState,
        body.intervalSeconds,
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Simulation tick failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating alarm API..."

cat > src/app/api/alarms/evaluate/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  evaluatePlantAlarms,
} from "@/lib/alarms/alarm-engine";

import type {
  PlantState,
} from "@/types/hvac";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        state: PlantState;
      };

    const alarms =
      evaluatePlantAlarms(
        body.state,
      );

    return NextResponse.json({
      success: true,
      count: alarms.length,
      alarms,
      timestamp:
        new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Alarm evaluation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

cat > src/app/api/alarms/route.ts <<'EOF'
export {
  POST,
} from "@/app/api/alarms/evaluate/route";
EOF

echo "Creating energy API..."

cat > src/app/api/energy/summary/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateEnergySummary,
} from "@/lib/energy/energy-engine";

import type {
  EnergySample,
} from "@/types/analytics";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        samples: EnergySample[];
      };

    const summary =
      calculateEnergySummary(
        body.samples ?? [],
      );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Energy summary calculation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

cat > src/app/api/energy/route.ts <<'EOF'
export {
  POST,
} from "@/app/api/energy/summary/route";
EOF

echo "Extending simulation store..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/store/simulation-store.ts"
)

content = path.read_text()

content = content.replace(
    '''import type {
  LumiCommand,
  PlantState,
} from "@/types/hvac";
''',
    '''import type {
  ActiveAlarm,
  EnergySample,
} from "@/types/analytics";

import type {
  LumiCommand,
  PlantState,
} from "@/types/hvac";
'''
)

content = content.replace(
    '''interface SimulationActions {
''',
    '''interface SimulationAnalyticsState {
  energyHistory: EnergySample[];
  activeAlarms: ActiveAlarm[];
}

interface SimulationActions {
'''
)

content = content.replace(
    '''  executeCommand: (
    command: LumiCommand,
  ) => CommandExecutionResult;
}
''',
    '''  executeCommand: (
    command: LumiCommand,
  ) => CommandExecutionResult;

  applySimulationTick: (
    state: PlantState,
    energySample: EnergySample,
    alarms: ActiveAlarm[],
  ) => void;

  acknowledgeAlarm: (
    alarmId: string,
  ) => void;

  clearEnergyHistory: () => void;
}
'''
)

content = content.replace(
    '''export type SimulationStore =
  PlantState & SimulationActions;
''',
    '''export type SimulationStore =
  PlantState &
  SimulationAnalyticsState &
  SimulationActions;
'''
)

content = content.replace(
    '''    ...initialPlantState,

    hydrate: (state) => {
''',
    '''    ...initialPlantState,

    energyHistory: [],

    activeAlarms: [],

    hydrate: (state) => {
'''
)

content = content.replace(
    '''    resetSimulation: () => {
      set({
        ...initialPlantState,
        timestamp: new Date().toISOString(),
      });
    },
''',
    '''    resetSimulation: () => {
      set({
        ...initialPlantState,
        timestamp: new Date().toISOString(),
        energyHistory: [],
        activeAlarms: [],
      });
    },
'''
)

insert_marker = '''    executeCommand: (command) => {
'''

insert_code = '''    applySimulationTick: (
      state,
      energySample,
      alarms,
    ) => {
      const current =
        get();

      const acknowledgedIds =
        new Set(
          current.activeAlarms
            .filter(
              (alarm) =>
                alarm.acknowledged,
            )
            .map(
              (alarm) =>
                alarm.alarmId,
            ),
        );

      const activeAlarms =
        alarms.map((alarm) => ({
          ...alarm,
          acknowledged:
            acknowledgedIds.has(
              alarm.alarmId,
            ),
        }));

      set({
        ...state,

        activeAlarms,

        energyHistory: [
          ...current.energyHistory,
          energySample,
        ].slice(-120),
      });
    },

    acknowledgeAlarm: (
      alarmId,
    ) => {
      set((state) => ({
        activeAlarms:
          state.activeAlarms.map(
            (alarm) =>
              alarm.alarmId ===
              alarmId
                ? {
                    ...alarm,
                    acknowledged:
                      true,
                  }
                : alarm,
          ),
      }));
    },

    clearEnergyHistory: () => {
      set({
        energyHistory: [],
      });
    },

'''

if insert_code.strip() not in content:
    content = content.replace(
        insert_marker,
        insert_code + insert_marker,
    )

path.write_text(content)
PYTHON

echo "Creating continuous simulation hook..."

cat > src/hooks/use-simulation-engine.ts <<'EOF'
"use client";

import {
  useEffect,
} from "react";

import {
  runSimulationTick,
} from "@/lib/simulation/tick-engine";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  PlantState,
} from "@/types/hvac";

function extractPlantState():
  PlantState {
  const state =
    useSimulationStore.getState();

  return {
    timestamp:
      state.timestamp,

    simulationRunning:
      state.simulationRunning,

    simulationSpeed:
      state.simulationSpeed,

    operatingMode:
      state.operatingMode,

    totalPowerKw:
      state.totalPowerKw,

    totalEnergyKwh:
      state.totalEnergyKwh,

    activeAlarmCount:
      state.activeAlarmCount,

    expectedPassengers:
      state.expectedPassengers,

    chillers:
      state.chillers,

    ahus:
      state.ahus,

    chilledWaterPumps:
      state.chilledWaterPumps,

    condenserWaterPumps:
      state.condenserWaterPumps,

    coolingTowers:
      state.coolingTowers,

    flightDemand:
      state.flightDemand,
  };
}

export function useSimulationEngine() {
  useEffect(() => {
    const interval = setInterval(
      () => {
        const store =
          useSimulationStore
            .getState();

        if (
          !store.simulationRunning
        ) {
          return;
        }

        const intervalSeconds =
          Math.max(
            0.1,
            store.simulationSpeed,
          );

        const result =
          runSimulationTick(
            extractPlantState(),
            intervalSeconds,
          );

        store.applySimulationTick(
          result.state,
          result.energySample,
          result.alarms,
        );
      },
      1000,
    );

    return () => {
      clearInterval(interval);
    };
  }, []);
}
EOF

echo "Creating energy chart..."

cat > src/components/energy/energy-chart.tsx <<'EOF'
"use client";

import {
  Activity,
  BatteryCharging,
  Gauge,
  Leaf,
  Trash2,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  calculateEnergySummary,
} from "@/lib/energy/energy-engine";

import {
  useSimulationStore,
} from "@/store/simulation-store";

function formatTime(
  timestamp: string,
): string {
  return new Date(
    timestamp,
  ).toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

export function EnergyChart() {
  const energyHistory =
    useSimulationStore(
      (state) =>
        state.energyHistory,
    );

  const clearEnergyHistory =
    useSimulationStore(
      (state) =>
        state.clearEnergyHistory,
    );

  const summary =
    calculateEnergySummary(
      energyHistory,
    );

  const chartData =
    energyHistory.map(
      (sample) => ({
        ...sample,
        time:
          formatTime(
            sample.timestamp,
          ),
      }),
    );

  const cards = [
    {
      label:
        "Current Power",
      value:
        `${summary.currentPowerKw} kW`,
      icon: Zap,
    },
    {
      label:
        "Energy",
      value:
        `${summary.totalEnergyKwh} kWh`,
      icon:
        BatteryCharging,
    },
    {
      label:
        "Peak Demand",
      value:
        `${summary.peakPowerKw} kW`,
      icon: Gauge,
    },
    {
      label:
        "Estimated Saving",
      value:
        `${summary.estimatedSavingPercent}%`,
      icon: Leaf,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity
              size={20}
              className="text-cyan-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Live Energy Analytics
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Continuous virtual plant
            power and energy tracking
          </p>
        </div>

        <button
          type="button"
          onClick={
            clearEnergyHistory
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
        >
          <Trash2 size={15} />
          Clear history
        </button>
      </header>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(
            ({
              label,
              value,
              icon: Icon,
            }) => (
              <article
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon
                    size={14}
                  />
                  {label}
                </div>

                <p className="mt-2 text-xl font-semibold text-white">
                  {value}
                </p>
              </article>
            ),
          )}
        </div>

        <div className="mt-6 h-80">
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
              Collecting simulation
              energy samples...
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="powerGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#22d3ee"
                      stopOpacity={0.45}
                    />

                    <stop
                      offset="95%"
                      stopColor="#22d3ee"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  unit=" kW"
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#020617",
                    border:
                      "1px solid #334155",
                    borderRadius:
                      "12px",
                  }}
                  labelStyle={{
                    color: "#94a3b8",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="totalPowerKw"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#powerGradient)"
                  name="Plant Power"
                  unit=" kW"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
EOF

echo "Creating alarm center..."

cat > src/components/alarms/alarm-center.tsx <<'EOF'
"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  AlarmLevel,
} from "@/types/hvac";

function alarmStyle(
  level: AlarmLevel,
): string {
  switch (level) {
    case "critical":
      return "border-red-500/40 bg-red-500/10";

    case "high":
      return "border-orange-500/40 bg-orange-500/10";

    case "warning":
      return "border-amber-500/40 bg-amber-500/10";

    case "information":
      return "border-cyan-500/40 bg-cyan-500/10";

    default:
      return "border-slate-800 bg-slate-950/70";
  }
}

function AlarmIcon({
  level,
}: {
  level: AlarmLevel;
}) {
  if (
    level === "critical"
  ) {
    return (
      <ShieldAlert
        size={20}
        className="text-red-300"
      />
    );
  }

  if (
    level === "high" ||
    level === "warning"
  ) {
    return (
      <AlertTriangle
        size={20}
        className="text-amber-300"
      />
    );
  }

  return (
    <AlertCircle
      size={20}
      className="text-cyan-300"
    />
  );
}

export function AlarmCenter() {
  const alarms =
    useSimulationStore(
      (state) =>
        state.activeAlarms,
    );

  const acknowledgeAlarm =
    useSimulationStore(
      (state) =>
        state.acknowledgeAlarm,
    );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert
              size={20}
              className="text-amber-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Alarm Center
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Rule-based virtual HVAC
            alarm detection
          </p>
        </div>

        <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
          {alarms.length}
        </div>
      </header>

      <div className="space-y-3 p-5">
        {alarms.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2
              size={34}
              className="text-emerald-400"
            />

            <p className="mt-3 font-medium text-emerald-300">
              No active alarms
            </p>

            <p className="mt-1 text-sm text-slate-500">
              All monitored virtual
              HVAC parameters are within
              configured limits.
            </p>
          </div>
        ) : (
          alarms.map(
            (alarm) => (
              <article
                key={
                  alarm.alarmId
                }
                className={[
                  "rounded-xl border p-4",
                  alarmStyle(
                    alarm.alarmLevel,
                  ),
                  alarm.acknowledged
                    ? "opacity-60"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <AlarmIcon
                    level={
                      alarm.alarmLevel
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">
                          {
                            alarm.equipmentId
                          }{" "}
                          ·{" "}
                          {
                            alarm.alarmCode
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-300">
                          {
                            alarm.message
                          }
                        </p>
                      </div>

                      <span className="rounded-full border border-current/20 px-2 py-1 text-xs font-semibold uppercase text-slate-300">
                        {
                          alarm.alarmLevel
                        }
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-400">
                      <p>
                        Current:{" "}
                        <span className="font-medium text-white">
                          {
                            alarm.measuredValue
                          }{" "}
                          {
                            alarm.unit
                          }
                        </span>
                      </p>

                      <p>
                        Threshold:{" "}
                        {
                          alarm.thresholdValue
                        }{" "}
                        {
                          alarm.unit
                        }
                      </p>

                      <p>
                        Probable cause:{" "}
                        {
                          alarm.probableCause
                        }
                      </p>

                      <p>
                        Recommended action:{" "}
                        {
                          alarm.recommendedAction
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        alarm.acknowledged
                      }
                      onClick={() =>
                        acknowledgeAlarm(
                          alarm.alarmId,
                        )
                      }
                      className="mt-4 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {alarm.acknowledged
                        ? "Acknowledged"
                        : "Acknowledge alarm"}
                    </button>
                  </div>
                </div>
              </article>
            ),
          )
        )}
      </div>
    </section>
  );
}
EOF

echo "Creating simulation runtime component..."

cat > src/components/dashboard/simulation-runtime.tsx <<'EOF'
"use client";

import {
  useSimulationEngine,
} from "@/hooks/use-simulation-engine";

export function SimulationRuntime() {
  useSimulationEngine();

  return null;
}
EOF

echo "Adding energy and alarms to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/components/dashboard/plant-dashboard.tsx"
)

content = path.read_text()

imports = [
    (
        'import { AlarmCenter } from "@/components/alarms/alarm-center";\n'
    ),
    (
        'import { EnergyChart } from "@/components/energy/energy-chart";\n'
    ),
    (
        'import { SimulationRuntime } from "@/components/dashboard/simulation-runtime";\n'
    ),
]

anchor = (
    'import { KpiCard } from "@/components/dashboard/kpi-card";\n'
)

for import_line in imports:
    if import_line not in content:
        content = content.replace(
            anchor,
            anchor + import_line,
        )

runtime_marker = (
    '    <main className="min-h-screen'
)

if (
    "<SimulationRuntime />"
    not in content
):
    content = content.replace(
        runtime_marker,
        '''    <>
      <SimulationRuntime />

      <main className="min-h-screen''',
        1,
    )

closing = '''    </main>
  );
}
'''

replacement = '''    </main>
    </>
  );
}
'''

if (
    "<SimulationRuntime />"
    in content and
    closing in content
):
    content = content.replace(
        closing,
        replacement,
        1,
    )

panel_marker = (
    '        <FlightSchedulePanel />'
)

panel_block = '''        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
          <EnergyChart />
          <AlarmCenter />
        </section>

'''

if (
    "<EnergyChart />"
    not in content
):
    content = content.replace(
        panel_marker,
        panel_block +
        panel_marker,
        1,
    )

path.write_text(content)
PYTHON

echo "Formatting Part 7 files..."

npx prettier --write \
  src/types/analytics.ts \
  src/lib/energy/energy-engine.ts \
  src/lib/alarms/alarm-engine.ts \
  src/lib/simulation/tick-engine.ts \
  src/app/api/simulation/tick/route.ts \
  src/app/api/alarms/route.ts \
  src/app/api/alarms/evaluate/route.ts \
  src/app/api/energy/route.ts \
  src/app/api/energy/summary/route.ts \
  src/store/simulation-store.ts \
  src/hooks/use-simulation-engine.ts \
  src/components/energy/energy-chart.tsx \
  src/components/alarms/alarm-center.tsx \
  src/components/dashboard/simulation-runtime.tsx \
  src/components/dashboard/plant-dashboard.tsx

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Staging Part 7 changes..."

git add \
  scripts/07-simulation-energy-and-alarms.sh \
  src/types/analytics.ts \
  src/lib/energy/energy-engine.ts \
  src/lib/alarms/alarm-engine.ts \
  src/lib/simulation/tick-engine.ts \
  src/app/api/simulation/tick/route.ts \
  src/app/api/alarms/route.ts \
  src/app/api/alarms/evaluate/route.ts \
  src/app/api/energy/route.ts \
  src/app/api/energy/summary/route.ts \
  src/store/simulation-store.ts \
  src/hooks/use-simulation-engine.ts \
  src/components/energy/energy-chart.tsx \
  src/components/alarms/alarm-center.tsx \
  src/components/dashboard/simulation-runtime.tsx \
  src/components/dashboard/plant-dashboard.tsx

if git diff --cached --quiet; then
  echo "No new Part 7 changes to commit."
else
  git commit \
    -m "feat: add continuous simulation energy analytics and alarms"

  git push
fi

echo
echo "============================================================"
echo "PART 7 COMPLETED SUCCESSFULLY"
echo "Continuous simulation, energy analytics and alarms are ready"
echo "============================================================"
echo
echo "Available APIs:"
echo "  POST /api/simulation/tick"
echo "  POST /api/alarms"
echo "  POST /api/alarms/evaluate"
echo "  POST /api/energy"
echo "  POST /api/energy/summary"
echo
echo "Dashboard features:"
echo "  Live plant simulation"
echo "  Energy history chart"
echo "  Peak and average power"
echo "  Estimated energy saving"
echo "  Automatic HVAC alarms"
echo "  Alarm acknowledgement"
echo
