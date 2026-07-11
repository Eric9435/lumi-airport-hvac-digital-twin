#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

on_error() {
  local exit_code=$?
  local line_number=${1:-unknown}

  echo
  echo "============================================================"
  echo "PART 4 FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'on_error $LINENO' ERR

cd "${PROJECT_ROOT}"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json was not found in ${PROJECT_ROOT}" >&2
  exit 1
fi

if [[ ! -f tsconfig.json ]]; then
  echo "ERROR: tsconfig.json was not found." >&2
  exit 1
fi

echo "============================================================"
echo "PART 4 — HVAC DOMAIN AND SIMULATION CORE"
echo "============================================================"

mkdir -p \
  src/types \
  src/lib/constants \
  src/lib/simulation \
  src/lib/validation \
  src/services \
  src/store \
  src/app/api/bootstrap \
  src/app/api/simulation/state \
  src/app/api/lumi/command

echo "Creating HVAC domain types..."

cat > src/types/hvac.ts <<'EOF'
export type EquipmentStatus =
  | "running"
  | "standby"
  | "stopped"
  | "starting"
  | "stopping"
  | "warning"
  | "alarm"
  | "maintenance"
  | "offline";

export type OperatingMode =
  | "automatic"
  | "manual"
  | "eco"
  | "comfort"
  | "boost"
  | "emergency";

export type AlarmLevel =
  | "normal"
  | "information"
  | "warning"
  | "high"
  | "critical";

export interface EquipmentBase {
  id: string;
  name: string;
  status: EquipmentStatus;
  mode: OperatingMode;
  enabled: boolean;
  runtimeHours: number;
  alarmLevel: AlarmLevel;
  alarmCode: string | null;
  lastUpdated: string;
}

export interface ChillerState extends EquipmentBase {
  equipmentType: "chiller";
  ratedPowerKw: number;
  ratedCoolingCapacityKw: number;
  loadPercent: number;
  powerKw: number;
  energyKwh: number;
  chilledWaterSupplyTempC: number;
  chilledWaterReturnTempC: number;
  chilledWaterDeltaTC: number;
  chilledWaterFlowM3h: number;
  condenserWaterEnteringTempC: number;
  condenserWaterLeavingTempC: number;
  condenserWaterFlowM3h: number;
  cop: number;
  compressorRunning: boolean;
  leadLagOrder: number;
  startCount: number;
}

export interface AhuState extends EquipmentBase {
  equipmentType: "ahu";
  zoneId: string;
  zoneName: string;
  fanSpeedPercent: number;
  airflowCmh: number;
  designAirflowCmh: number;
  supplyAirTempC: number;
  returnAirTempC: number;
  zoneTempC: number;
  setpointC: number;
  coolingValvePercent: number;
  damperPositionPercent: number;
  outdoorAirPercent: number;
  filterDifferentialPressurePa: number;
  powerKw: number;
  occupancy: number;
  co2Ppm: number;
}

export interface PumpState extends EquipmentBase {
  equipmentType:
    | "chilled-water-pump"
    | "condenser-water-pump";
  servedEquipmentIds: string[];
  speedPercent: number;
  flowM3h: number;
  designFlowM3h: number;
  headM: number;
  suctionPressureBar: number;
  dischargePressureBar: number;
  differentialPressureBar: number;
  powerKw: number;
  currentA: number;
}

export interface CoolingTowerState extends EquipmentBase {
  equipmentType: "cooling-tower";
  fanSpeedPercent: number;
  enteringWaterTempC: number;
  leavingWaterTempC: number;
  rangeC: number;
  approachC: number;
  waterFlowM3h: number;
  ambientWetBulbTempC: number;
  powerKw: number;
}

export interface FlightDemandState {
  date: string;
  currentFlights: number;
  flightsNextHour: number;
  flightsNextTwoHours: number;
  expectedPassengers: number;
  arrivalPassengers: number;
  departurePassengers: number;
  demandLevel: "low" | "normal" | "high" | "peak";
}

export interface PlantState {
  timestamp: string;
  simulationRunning: boolean;
  simulationSpeed: number;
  operatingMode: OperatingMode;
  totalPowerKw: number;
  totalEnergyKwh: number;
  activeAlarmCount: number;
  expectedPassengers: number;
  chillers: ChillerState[];
  ahus: AhuState[];
  chilledWaterPumps: PumpState[];
  condenserWaterPumps: PumpState[];
  coolingTowers: CoolingTowerState[];
  flightDemand: FlightDemandState;
}

export type LumiCommand =
  | {
      action: "START_CHILLER";
      equipmentId: string;
    }
  | {
      action: "STOP_CHILLER";
      equipmentId: string;
    }
  | {
      action: "SET_AHU_FAN_SPEED";
      equipmentId: string;
      value: number;
    }
  | {
      action: "SET_AHU_SETPOINT";
      equipmentId: string;
      value: number;
    }
  | {
      action: "START_AHU";
      equipmentId: string;
    }
  | {
      action: "STOP_AHU";
      equipmentId: string;
    }
  | {
      action: "SHOW_PLANT_STATUS";
    }
  | {
      action: "UNKNOWN";
      originalText: string;
    };
EOF

echo "Creating equipment configuration..."

cat > src/lib/constants/equipment.ts <<'EOF'
export const PLANT_CONFIGURATION = {
  id: "PLANT-01",
  name: "LUMI Virtual Airport HVAC Plant",
  location: "Virtual Airport Terminal",
  simulationMode: true,
  chillerQuantity: 4,
  ratedPowerPerChillerKw: 11,
  totalRatedChillerPowerKw: 44,
  defaultChilledWaterSupplyTempC: 7,
  defaultChilledWaterReturnTempC: 12.5,
  defaultCondenserWaterEnteringTempC: 29,
  defaultCondenserWaterLeavingTempC: 34,
  simulationTickMs: 1000,
  snapshotIntervalMs: 60000,
} as const;

export const CHILLER_CONFIGURATION = [
  {
    id: "CH-01",
    name: "Water-Cooled Chiller 01",
    ratedPowerKw: 11,
    ratedCoolingCapacityKw: 52,
    designCop: 4.7,
    leadLagOrder: 1,
  },
  {
    id: "CH-02",
    name: "Water-Cooled Chiller 02",
    ratedPowerKw: 11,
    ratedCoolingCapacityKw: 52,
    designCop: 4.7,
    leadLagOrder: 2,
  },
  {
    id: "CH-03",
    name: "Water-Cooled Chiller 03",
    ratedPowerKw: 11,
    ratedCoolingCapacityKw: 52,
    designCop: 4.7,
    leadLagOrder: 3,
  },
  {
    id: "CH-04",
    name: "Water-Cooled Chiller 04",
    ratedPowerKw: 11,
    ratedCoolingCapacityKw: 52,
    designCop: 4.7,
    leadLagOrder: 4,
  },
] as const;

export const AHU_CONFIGURATION = [
  {
    id: "AHU-01",
    name: "Check-in Hall AHU",
    zoneId: "ZONE-CHECKIN",
    zoneName: "Check-in Hall",
    designAirflowCmh: 18000,
    designFanPowerKw: 7.5,
    normalSetpointC: 23,
    designOccupancy: 500,
  },
  {
    id: "AHU-02",
    name: "Departure Hall AHU",
    zoneId: "ZONE-DEPARTURE",
    zoneName: "Departure Hall",
    designAirflowCmh: 20000,
    designFanPowerKw: 8.5,
    normalSetpointC: 22.5,
    designOccupancy: 700,
  },
  {
    id: "AHU-03",
    name: "Arrival Hall AHU",
    zoneId: "ZONE-ARRIVAL",
    zoneName: "Arrival Hall",
    designAirflowCmh: 19500,
    designFanPowerKw: 8.2,
    normalSetpointC: 23,
    designOccupancy: 650,
  },
  {
    id: "AHU-04",
    name: "Baggage Claim AHU",
    zoneId: "ZONE-BAGGAGE",
    zoneName: "Baggage Claim",
    designAirflowCmh: 16000,
    designFanPowerKw: 6.8,
    normalSetpointC: 23.5,
    designOccupancy: 450,
  },
  {
    id: "AHU-05",
    name: "VIP Lounge AHU",
    zoneId: "ZONE-VIP",
    zoneName: "VIP Lounge",
    designAirflowCmh: 8000,
    designFanPowerKw: 3.5,
    normalSetpointC: 22,
    designOccupancy: 120,
  },
  {
    id: "AHU-06",
    name: "Immigration Hall AHU",
    zoneId: "ZONE-IMMIGRATION",
    zoneName: "Immigration Hall",
    designAirflowCmh: 15000,
    designFanPowerKw: 6.2,
    normalSetpointC: 23,
    designOccupancy: 400,
  },
] as const;
EOF

echo "Creating engineering thresholds..."

cat > src/lib/constants/thresholds.ts <<'EOF'
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
EOF

echo "Creating initial virtual plant state..."

cat > src/lib/simulation/initial-state.ts <<'EOF'
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

const chillers: ChillerState[] =
  CHILLER_CONFIGURATION.map((configuration, index) => {
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
      ratedCoolingCapacityKw:
        configuration.ratedCoolingCapacityKw,
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
  });

const ahus: AhuState[] =
  AHU_CONFIGURATION.map((configuration, index) => {
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
      airflowCmh: Math.round(
        configuration.designAirflowCmh * airflowRatio,
      ),
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
        (
          configuration.designFanPowerKw *
          Math.pow(airflowRatio, 3)
        ).toFixed(2),
      ),
      occupancy: Math.round(
        configuration.designOccupancy * 0.4,
      ),
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

  const chilledWaterPumpPower =
    chilledWaterPumps.reduce(
      (total, equipment) => total + equipment.powerKw,
      0,
    );

  const condenserWaterPumpPower =
    condenserWaterPumps.reduce(
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
EOF

echo "Creating plant calculation engine..."

cat > src/lib/simulation/plant-calculations.ts <<'EOF'
import type { PlantState } from "@/types/hvac";

export function calculatePlantTotalPower(
  state: PlantState,
): number {
  const chillerPower = state.chillers.reduce(
    (total, item) => total + item.powerKw,
    0,
  );

  const ahuPower = state.ahus.reduce(
    (total, item) => total + item.powerKw,
    0,
  );

  const chilledWaterPumpPower =
    state.chilledWaterPumps.reduce(
      (total, item) => total + item.powerKw,
      0,
    );

  const condenserWaterPumpPower =
    state.condenserWaterPumps.reduce(
      (total, item) => total + item.powerKw,
      0,
    );

  const coolingTowerPower =
    state.coolingTowers.reduce(
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

export function calculateActiveAlarmCount(
  state: PlantState,
): number {
  const equipment = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ];

  return equipment.filter(
    (item) => item.alarmLevel !== "normal",
  ).length;
}
EOF

echo "Creating command parser..."

cat > src/services/lumi-command.service.ts <<'EOF'
import type { LumiCommand } from "@/types/hvac";

export function parseLumiCommand(
  input: string,
): LumiCommand {
  const normalized = input.trim().toUpperCase();

  const startChiller =
    normalized.match(/\bSTART\s+(CH-\d{2})\b/);

  if (startChiller) {
    return {
      action: "START_CHILLER",
      equipmentId: startChiller[1],
    };
  }

  const stopChiller =
    normalized.match(/\bSTOP\s+(CH-\d{2})\b/);

  if (stopChiller) {
    return {
      action: "STOP_CHILLER",
      equipmentId: stopChiller[1],
    };
  }

  const startAhu =
    normalized.match(/\bSTART\s+(AHU-\d{2})\b/);

  if (startAhu) {
    return {
      action: "START_AHU",
      equipmentId: startAhu[1],
    };
  }

  const stopAhu =
    normalized.match(/\bSTOP\s+(AHU-\d{2})\b/);

  if (stopAhu) {
    return {
      action: "STOP_AHU",
      equipmentId: stopAhu[1],
    };
  }

  const fanSpeed = normalized.match(
    /\b(?:SET|CHANGE)\s+(AHU-\d{2}).*?(?:FAN\s+SPEED\s+)?(?:TO\s+)?(\d{1,3})\s*%/,
  );

  if (fanSpeed) {
    return {
      action: "SET_AHU_FAN_SPEED",
      equipmentId: fanSpeed[1],
      value: Number(fanSpeed[2]),
    };
  }

  const setpoint = normalized.match(
    /\b(?:SET|CHANGE)\s+(AHU-\d{2}).*?(?:SETPOINT|TEMPERATURE).*?(\d{1,2}(?:\.\d+)?)\s*°?C?\b/,
  );

  if (setpoint) {
    return {
      action: "SET_AHU_SETPOINT",
      equipmentId: setpoint[1],
      value: Number(setpoint[2]),
    };
  }

  if (
    normalized.includes("PLANT STATUS") ||
    normalized.includes("SYSTEM STATUS") ||
    normalized.includes("PLANT OVERVIEW")
  ) {
    return {
      action: "SHOW_PLANT_STATUS",
    };
  }

  return {
    action: "UNKNOWN",
    originalText: input,
  };
}
EOF

echo "Creating command validation..."

cat > src/lib/validation/lumi-command.ts <<'EOF'
import type { LumiCommand } from "@/types/hvac";

export interface CommandValidationResult {
  valid: boolean;
  message: string;
}

export function validateLumiCommand(
  command: LumiCommand,
): CommandValidationResult {
  if (command.action === "UNKNOWN") {
    return {
      valid: false,
      message: "The command could not be understood.",
    };
  }

  if (
    command.action === "SET_AHU_FAN_SPEED" &&
    (command.value < 0 || command.value > 100)
  ) {
    return {
      valid: false,
      message:
        "AHU fan speed must be between 0% and 100%.",
    };
  }

  if (
    command.action === "SET_AHU_SETPOINT" &&
    (command.value < 16 || command.value > 30)
  ) {
    return {
      valid: false,
      message:
        "AHU temperature setpoint must be between 16°C and 30°C.",
    };
  }

  return {
    valid: true,
    message: "Command validation passed.",
  };
}
EOF

echo "Creating bootstrap API..."

cat > src/app/api/bootstrap/route.ts <<'EOF'
import { NextResponse } from "next/server";

import { initialPlantState } from "@/lib/simulation/initial-state";

export async function GET() {
  return NextResponse.json({
    success: true,
    mode: "virtual-simulation",
    state: initialPlantState,
  });
}
EOF

echo "Creating simulation-state API..."

cat > src/app/api/simulation/state/route.ts <<'EOF'
import { NextResponse } from "next/server";

import { initialPlantState } from "@/lib/simulation/initial-state";

export async function GET() {
  return NextResponse.json({
    success: true,
    state: initialPlantState,
  });
}
EOF

echo "Creating LUMI command API..."

cat > src/app/api/lumi/command/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import { validateLumiCommand } from "@/lib/validation/lumi-command";
import { parseLumiCommand } from "@/services/lumi-command.service";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(
      await request.json(),
    );

    const command = parseLumiCommand(body.message);
    const validation =
      validateLumiCommand(command);

    return NextResponse.json(
      {
        success: validation.valid,
        command,
        validation,
        receivedAt: new Date().toISOString(),
      },
      {
        status: validation.valid ? 200 : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid command request.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Running formatting..."

npx prettier --write \
  src/types/hvac.ts \
  src/lib/constants/equipment.ts \
  src/lib/constants/thresholds.ts \
  src/lib/simulation/initial-state.ts \
  src/lib/simulation/plant-calculations.ts \
  src/lib/validation/lumi-command.ts \
  src/services/lumi-command.service.ts \
  src/app/api/bootstrap/route.ts \
  src/app/api/simulation/state/route.ts \
  src/app/api/lumi/command/route.ts

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Creating Git commit..."

git add \
  scripts/04-hvac-domain-and-simulation.sh \
  src/types/hvac.ts \
  src/lib/constants/equipment.ts \
  src/lib/constants/thresholds.ts \
  src/lib/simulation/initial-state.ts \
  src/lib/simulation/plant-calculations.ts \
  src/lib/validation/lumi-command.ts \
  src/services/lumi-command.service.ts \
  src/app/api/bootstrap/route.ts \
  src/app/api/simulation/state/route.ts \
  src/app/api/lumi/command/route.ts

if git diff --cached --quiet; then
  echo "No new Part 4 changes to commit."
else
  git commit \
    -m "feat: add HVAC domain model and virtual plant core"

  git push
fi

echo
echo "============================================================"
echo "PART 4 COMPLETED SUCCESSFULLY"
echo "HVAC domain and simulation core are ready"
echo "============================================================"
echo
echo "Available APIs:"
echo "  GET  /api/bootstrap"
echo "  GET  /api/simulation/state"
echo "  POST /api/lumi/command"
echo
echo "Example LUMI command:"
echo '  {"message":"Start CH-02"}'
echo
