#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 9 FAILED"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

required_files=(
  "package.json"
  "src/types/hvac.ts"
  "src/store/simulation-store.ts"
  "src/components/dashboard/plant-dashboard.tsx"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Required file was not found: $file" >&2
    exit 1
  fi
done

echo "============================================================"
echo "PART 9 — SCENARIOS, REPORTS AND AUDIT TRAIL"
echo "============================================================"

mkdir -p \
  src/types \
  src/data/demo \
  src/lib/scenarios \
  src/lib/reports \
  src/services \
  src/app/api/scenarios \
  src/app/api/scenarios/execute \
  src/app/api/reports/daily \
  src/app/api/audit \
  src/components/simulation \
  src/components/reports \
  src/components/audit \
  docs/reports

echo "Creating scenario, reporting and audit types..."

cat > src/types/operations.ts <<'EOF'
import type {
  AlarmLevel,
  OperatingMode,
  PlantState,
} from "@/types/hvac";

export type ScenarioStatus =
  | "available"
  | "running"
  | "completed"
  | "cancelled";

export type ScenarioCategory =
  | "normal-operation"
  | "peak-demand"
  | "equipment-failure"
  | "energy"
  | "emergency"
  | "maintenance";

export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  durationMinutes: number;
  passengerMultiplier: number;
  ambientTemperatureC: number;
  affectedEquipmentIds: string[];
  injectedFaultCode: string | null;
  severity: AlarmLevel;
  targetOperatingMode: OperatingMode;
  status: ScenarioStatus;
}

export interface ScenarioExecutionResult {
  executionId: string;
  scenarioId: string;
  scenarioName: string;
  startedAt: string;
  completedAt: string;
  summary: string;
  previousState: PlantState;
  resultingState: PlantState;
}

export interface DailyOperationalReport {
  reportId: string;
  reportDate: string;
  generatedAt: string;
  operatingMode: OperatingMode;
  totalFlights: number;
  expectedPassengers: number;
  runningChillers: number;
  activeAhus: number;
  totalPlantPowerKw: number;
  totalEnergyKwh: number;
  activeAlarmCount: number;
  warningCount: number;
  criticalCount: number;
  averageChillerCop: number;
  plantAvailabilityPercent: number;
  estimatedEnergySavingKwh: number;
  estimatedCarbonKg: number;
  executiveSummary: string;
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  actor: string;
  source:
    | "dashboard"
    | "lumi"
    | "simulation"
    | "api"
    | "system";
  action: string;
  module: string;
  recordId: string | null;
  oldValue: unknown;
  newValue: unknown;
  result:
    | "success"
    | "failed"
    | "rejected";
  details: string;
}
EOF

echo "Creating professional simulation scenarios..."

cat > src/data/demo/simulation-scenarios.ts <<'EOF'
import type {
  SimulationScenario,
} from "@/types/operations";

export const simulationScenarios:
  SimulationScenario[] = [
  {
    scenarioId: "SCN-NORMAL-DAY",
    name: "Normal Airport Day",
    description:
      "Normal terminal occupancy, standard flight activity and automatic HVAC operation.",
    category: "normal-operation",
    durationMinutes: 1440,
    passengerMultiplier: 1,
    ambientTemperatureC: 31,
    affectedEquipmentIds: [],
    injectedFaultCode: null,
    severity: "normal",
    targetOperatingMode: "automatic",
    status: "available",
  },
  {
    scenarioId: "SCN-PEAK-DEPARTURE",
    name: "Peak Departure Wave",
    description:
      "A concentrated departure schedule increases check-in and departure-hall cooling demand.",
    category: "peak-demand",
    durationMinutes: 180,
    passengerMultiplier: 1.65,
    ambientTemperatureC: 34,
    affectedEquipmentIds: [
      "AHU-01",
      "AHU-02",
    ],
    injectedFaultCode: null,
    severity: "warning",
    targetOperatingMode: "boost",
    status: "available",
  },
  {
    scenarioId: "SCN-HEAVY-ARRIVAL",
    name: "Heavy Arrival Wave",
    description:
      "Multiple arrivals increase immigration, baggage-claim and arrival-hall occupancy.",
    category: "peak-demand",
    durationMinutes: 150,
    passengerMultiplier: 1.5,
    ambientTemperatureC: 33,
    affectedEquipmentIds: [
      "AHU-03",
      "AHU-04",
      "AHU-06",
    ],
    injectedFaultCode: null,
    severity: "warning",
    targetOperatingMode: "boost",
    status: "available",
  },
  {
    scenarioId: "SCN-CHILLER-FAILURE",
    name: "Lead Chiller Failure",
    description:
      "The lead chiller trips during high cooling demand, requiring standby capacity and operator response.",
    category: "equipment-failure",
    durationMinutes: 90,
    passengerMultiplier: 1.25,
    ambientTemperatureC: 35,
    affectedEquipmentIds: [
      "CH-01",
    ],
    injectedFaultCode:
      "CHILLER_TRIP",
    severity: "critical",
    targetOperatingMode: "emergency",
    status: "available",
  },
  {
    scenarioId: "SCN-FILTER-BLOCKAGE",
    name: "AHU Filter Blockage",
    description:
      "AHU-02 filter differential pressure rises and airflow performance degrades.",
    category: "maintenance",
    durationMinutes: 240,
    passengerMultiplier: 1.1,
    ambientTemperatureC: 32,
    affectedEquipmentIds: [
      "AHU-02",
    ],
    injectedFaultCode:
      "FILTER_DP_HIGH",
    severity: "high",
    targetOperatingMode: "automatic",
    status: "available",
  },
  {
    scenarioId: "SCN-ENERGY-REDUCTION",
    name: "Energy Reduction Mode",
    description:
      "Non-critical zones enter eco mode while passenger comfort constraints remain active.",
    category: "energy",
    durationMinutes: 360,
    passengerMultiplier: 0.7,
    ambientTemperatureC: 29,
    affectedEquipmentIds: [
      "AHU-04",
      "AHU-05",
      "AHU-06",
    ],
    injectedFaultCode: null,
    severity: "information",
    targetOperatingMode: "eco",
    status: "available",
  },
];
EOF

echo "Creating simulation scenario engine..."

cat > src/lib/scenarios/scenario-engine.ts <<'EOF'
import type {
  AhuState,
  ChillerState,
  PlantState,
} from "@/types/hvac";

import type {
  SimulationScenario,
} from "@/types/operations";

function cloneState(
  state: PlantState,
): PlantState {
  return structuredClone(state);
}

function updateAhuForScenario(
  ahu: AhuState,
  scenario: SimulationScenario,
): AhuState {
  const affected =
    scenario.affectedEquipmentIds.includes(
      ahu.id,
    );

  if (
    scenario.injectedFaultCode ===
      "FILTER_DP_HIGH" &&
    affected
  ) {
    return {
      ...ahu,
      status: "warning",
      alarmLevel: "high",
      alarmCode: "FILTER_DP_HIGH",
      filterDifferentialPressurePa: 285,
      airflowCmh: Math.round(
        ahu.designAirflowCmh * 0.68,
      ),
      zoneTempC: Math.max(
        ahu.zoneTempC,
        26.8,
      ),
      lastUpdated:
        new Date().toISOString(),
    };
  }

  if (
    scenario.targetOperatingMode ===
      "boost" &&
    affected
  ) {
    return {
      ...ahu,
      mode: "boost",
      status: "running",
      fanSpeedPercent: Math.min(
        95,
        Math.max(
          ahu.fanSpeedPercent,
          82,
        ),
      ),
      coolingValvePercent: Math.min(
        100,
        Math.max(
          ahu.coolingValvePercent,
          80,
        ),
      ),
      occupancy: Math.round(
        ahu.occupancy *
          scenario.passengerMultiplier,
      ),
      lastUpdated:
        new Date().toISOString(),
    };
  }

  if (
    scenario.targetOperatingMode ===
      "eco" &&
    affected
  ) {
    return {
      ...ahu,
      mode: "eco",
      fanSpeedPercent: Math.max(
        40,
        ahu.fanSpeedPercent - 15,
      ),
      setpointC: Math.min(
        25,
        ahu.setpointC + 1.5,
      ),
      lastUpdated:
        new Date().toISOString(),
    };
  }

  return {
    ...ahu,
    occupancy: Math.round(
      ahu.occupancy *
        scenario.passengerMultiplier,
    ),
    lastUpdated:
      new Date().toISOString(),
  };
}

function updateChillerForScenario(
  chiller: ChillerState,
  scenario: SimulationScenario,
): ChillerState {
  const affected =
    scenario.affectedEquipmentIds.includes(
      chiller.id,
    );

  if (
    scenario.injectedFaultCode ===
      "CHILLER_TRIP" &&
    affected
  ) {
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
      lastUpdated:
        new Date().toISOString(),
    };
  }

  return {
    ...chiller,
    mode:
      scenario.targetOperatingMode,
    lastUpdated:
      new Date().toISOString(),
  };
}

export function applyScenario(
  currentState: PlantState,
  scenario: SimulationScenario,
): PlantState {
  const state =
    cloneState(currentState);

  state.timestamp =
    new Date().toISOString();

  state.operatingMode =
    scenario.targetOperatingMode;

  state.expectedPassengers =
    Math.round(
      currentState.expectedPassengers *
        scenario.passengerMultiplier,
    );

  state.flightDemand = {
    ...state.flightDemand,
    expectedPassengers:
      state.expectedPassengers,
    demandLevel:
      scenario.passengerMultiplier >= 1.5
        ? "peak"
        : scenario.passengerMultiplier >= 1.2
          ? "high"
          : scenario.passengerMultiplier < 0.8
            ? "low"
            : "normal",
  };

  state.chillers =
    state.chillers.map(
      (chiller) =>
        updateChillerForScenario(
          chiller,
          scenario,
        ),
    );

  state.ahus =
    state.ahus.map((ahu) =>
      updateAhuForScenario(
        ahu,
        scenario,
      ),
    );

  state.activeAlarmCount = [
    ...state.chillers,
    ...state.ahus,
    ...state.chilledWaterPumps,
    ...state.condenserWaterPumps,
    ...state.coolingTowers,
  ].filter(
    (equipment) =>
      equipment.alarmLevel !==
      "normal",
  ).length;

  return state;
}
EOF

echo "Creating report generator..."

cat > src/lib/reports/daily-report.ts <<'EOF'
import { randomUUID } from "node:crypto";

import type {
  ActiveAlarm,
  EnergySample,
} from "@/types/analytics";

import type {
  DailyOperationalReport,
} from "@/types/operations";

import type {
  PlantState,
} from "@/types/hvac";

function round(
  value: number,
  decimalPlaces = 2,
): number {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(value * factor) /
    factor
  );
}

export function generateDailyReport(
  state: PlantState,
  energySamples: EnergySample[],
  alarms: ActiveAlarm[],
  totalFlights: number,
): DailyOperationalReport {
  const runningChillers =
    state.chillers.filter(
      (chiller) =>
        chiller.status === "running",
    );

  const activeAhus =
    state.ahus.filter(
      (ahu) =>
        ahu.status === "running",
    );

  const runningChillerCop =
    runningChillers
      .filter(
        (chiller) =>
          chiller.cop > 0,
      )
      .map(
        (chiller) =>
          chiller.cop,
      );

  const averageChillerCop =
    runningChillerCop.length > 0
      ? runningChillerCop.reduce(
          (total, cop) =>
            total + cop,
          0,
        ) /
        runningChillerCop.length
      : 0;

  const currentEnergy =
    energySamples.length > 0
      ? energySamples[
          energySamples.length - 1
        ].cumulativeEnergyKwh
      : state.totalEnergyKwh;

  const baselineEnergy =
    currentEnergy * 1.12;

  const estimatedEnergySavingKwh =
    Math.max(
      0,
      baselineEnergy -
        currentEnergy,
    );

  const warningCount =
    alarms.filter(
      (alarm) =>
        alarm.alarmLevel ===
        "warning",
    ).length;

  const criticalCount =
    alarms.filter(
      (alarm) =>
        alarm.alarmLevel ===
        "critical",
    ).length;

  const unavailableEquipment =
    [
      ...state.chillers,
      ...state.ahus,
      ...state.chilledWaterPumps,
      ...state.condenserWaterPumps,
      ...state.coolingTowers,
    ].filter(
      (equipment) =>
        equipment.status ===
          "offline" ||
        equipment.status ===
          "alarm",
    ).length;

  const totalEquipment =
    state.chillers.length +
    state.ahus.length +
    state.chilledWaterPumps.length +
    state.condenserWaterPumps.length +
    state.coolingTowers.length;

  const availability =
    totalEquipment > 0
      ? (
          (totalEquipment -
            unavailableEquipment) /
          totalEquipment
        ) *
        100
      : 100;

  const executiveSummary =
    criticalCount > 0
      ? `Critical operational conditions were detected. ${criticalCount} critical alarm(s) require immediate review.`
      : warningCount > 0
        ? `The plant remained operational with ${warningCount} warning condition(s) requiring attention.`
        : "The virtual HVAC plant operated normally with no active warning or critical alarms.";

  return {
    reportId: randomUUID(),
    reportDate:
      new Date()
        .toISOString()
        .slice(0, 10),
    generatedAt:
      new Date().toISOString(),
    operatingMode:
      state.operatingMode,
    totalFlights,
    expectedPassengers:
      state.expectedPassengers,
    runningChillers:
      runningChillers.length,
    activeAhus:
      activeAhus.length,
    totalPlantPowerKw:
      round(
        state.totalPowerKw,
      ),
    totalEnergyKwh:
      round(currentEnergy),
    activeAlarmCount:
      alarms.length,
    warningCount,
    criticalCount,
    averageChillerCop:
      round(
        averageChillerCop,
      ),
    plantAvailabilityPercent:
      round(availability),
    estimatedEnergySavingKwh:
      round(
        estimatedEnergySavingKwh,
      ),
    estimatedCarbonKg:
      round(
        currentEnergy * 0.45,
      ),
    executiveSummary,
  };
}
EOF

echo "Creating in-memory audit repository..."

cat > src/services/audit-repository.ts <<'EOF'
import type {
  AuditRecord,
} from "@/types/operations";

const globalAuditStore =
  globalThis as typeof globalThis & {
    __lumiAuditRecords?:
      AuditRecord[];
  };

if (
  !globalAuditStore.__lumiAuditRecords
) {
  globalAuditStore.__lumiAuditRecords =
    [];
}

export function listAuditRecords():
  AuditRecord[] {
  return [
    ...(
      globalAuditStore
        .__lumiAuditRecords ?? []
    ),
  ];
}

export function appendAuditRecord(
  record: AuditRecord,
): AuditRecord {
  globalAuditStore
    .__lumiAuditRecords
    ?.unshift(record);

  globalAuditStore
    .__lumiAuditRecords =
    globalAuditStore
      .__lumiAuditRecords
      ?.slice(0, 500);

  return record;
}
EOF

echo "Creating scenario APIs..."

cat > src/app/api/scenarios/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  simulationScenarios,
} from "@/data/demo/simulation-scenarios";

export async function GET() {
  return NextResponse.json({
    success: true,
    scenarios:
      simulationScenarios,
  });
}
EOF

cat > src/app/api/scenarios/execute/route.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  simulationScenarios,
} from "@/data/demo/simulation-scenarios";

import {
  applyScenario,
} from "@/lib/scenarios/scenario-engine";

import {
  appendAuditRecord,
} from "@/services/audit-repository";

import type {
  PlantState,
} from "@/types/hvac";

const requestSchema =
  z.object({
    scenarioId:
      z.string().min(1),
    state: z.unknown(),
    actor:
      z.string().default(
        "Operator",
      ),
  });

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      requestSchema.parse(
        await request.json(),
      );

    const scenario =
      simulationScenarios.find(
        (item) =>
          item.scenarioId ===
          body.scenarioId,
      );

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Simulation scenario was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const previousState =
      body.state as PlantState;

    const resultingState =
      applyScenario(
        previousState,
        scenario,
      );

    const executionId =
      randomUUID();

    appendAuditRecord({
      auditId: randomUUID(),
      timestamp:
        new Date().toISOString(),
      actor: body.actor,
      source: "simulation",
      action:
        "EXECUTE_SCENARIO",
      module:
        "Simulation Scenarios",
      recordId:
        executionId,
      oldValue: {
        operatingMode:
          previousState.operatingMode,
        expectedPassengers:
          previousState.expectedPassengers,
      },
      newValue: {
        scenarioId:
          scenario.scenarioId,
        operatingMode:
          resultingState.operatingMode,
        expectedPassengers:
          resultingState.expectedPassengers,
      },
      result: "success",
      details:
        `Executed simulation scenario: ${scenario.name}`,
    });

    return NextResponse.json({
      success: true,
      execution: {
        executionId,
        scenarioId:
          scenario.scenarioId,
        scenarioName:
          scenario.name,
        startedAt:
          new Date().toISOString(),
        completedAt:
          new Date().toISOString(),
        summary:
          scenario.description,
        previousState,
        resultingState,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Scenario execution failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating daily report API..."

cat > src/app/api/reports/daily/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  generateDailyReport,
} from "@/lib/reports/daily-report";

import type {
  ActiveAlarm,
  EnergySample,
} from "@/types/analytics";

import type {
  PlantState,
} from "@/types/hvac";

const requestSchema =
  z.object({
    state: z.unknown(),
    energySamples:
      z.array(z.unknown())
        .default([]),
    alarms:
      z.array(z.unknown())
        .default([]),
    totalFlights:
      z.number()
        .int()
        .min(0)
        .default(0),
  });

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      requestSchema.parse(
        await request.json(),
      );

    const report =
      generateDailyReport(
        body.state as PlantState,
        body.energySamples as EnergySample[],
        body.alarms as ActiveAlarm[],
        body.totalFlights,
      );

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Daily report generation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating audit APIs..."

cat > src/app/api/audit/route.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  appendAuditRecord,
  listAuditRecords,
} from "@/services/audit-repository";

import type {
  AuditRecord,
} from "@/types/operations";

export async function GET() {
  return NextResponse.json({
    success: true,
    records:
      listAuditRecords(),
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as
        Partial<AuditRecord>;

    const record:
      AuditRecord = {
      auditId:
        body.auditId ??
        randomUUID(),

      timestamp:
        body.timestamp ??
        new Date().toISOString(),

      actor:
        body.actor ??
        "Operator",

      source:
        body.source ??
        "dashboard",

      action:
        body.action ??
        "UNKNOWN_ACTION",

      module:
        body.module ??
        "Unknown",

      recordId:
        body.recordId ??
        null,

      oldValue:
        body.oldValue ??
        null,

      newValue:
        body.newValue ??
        null,

      result:
        body.result ??
        "success",

      details:
        body.details ??
        "",
    };

    appendAuditRecord(
      record,
    );

    return NextResponse.json(
      {
        success: true,
        record,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Audit record creation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating scenario control panel..."

cat > src/components/simulation/scenario-panel.tsx <<'EOF'
"use client";

import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  LoaderCircle,
  Play,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  simulationScenarios,
} from "@/data/demo/simulation-scenarios";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  PlantState,
} from "@/types/hvac";

function extractState():
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

export function ScenarioPanel() {
  const hydrate =
    useSimulationStore(
      (state) =>
        state.hydrate,
    );

  const [runningId, setRunningId] =
    useState<string | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  async function executeScenario(
    scenarioId: string,
  ) {
    setRunningId(
      scenarioId,
    );

    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/scenarios/execute",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              scenarioId,
              state:
                extractState(),
              actor:
                "Dashboard Operator",
            }),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;
          error?: string;
          execution?: {
            scenarioName: string;
            resultingState:
              PlantState;
          };
        };

      if (
        !response.ok ||
        !result.success ||
        !result.execution
      ) {
        throw new Error(
          result.error ??
            "Scenario execution failed.",
        );
      }

      hydrate(
        result.execution
          .resultingState,
      );

      setMessage(
        `${result.execution.scenarioName} applied successfully.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Scenario execution failed.",
      );
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-2">
          <Beaker
            size={20}
            className="text-violet-300"
          />

          <h2 className="text-lg font-semibold text-white">
            Simulation Scenarios
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Test demand, failure,
          emergency and energy scenarios
        </p>
      </header>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        {simulationScenarios.map(
          (scenario) => {
            const running =
              runningId ===
              scenario.scenarioId;

            return (
              <article
                key={
                  scenario.scenarioId
                }
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {scenario.name}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {
                        scenario.description
                      }
                    </p>
                  </div>

                  {scenario.severity ===
                  "critical" ? (
                    <AlertTriangle
                      size={19}
                      className="shrink-0 text-red-300"
                    />
                  ) : (
                    <CheckCircle2
                      size={19}
                      className="shrink-0 text-cyan-300"
                    />
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>
                    {
                      scenario.durationMinutes
                    }{" "}
                    min
                  </span>

                  <span>·</span>

                  <span>
                    Passenger ×
                    {
                      scenario.passengerMultiplier
                    }
                  </span>

                  <span>·</span>

                  <span>
                    {
                      scenario.ambientTemperatureC
                    }
                    °C
                  </span>
                </div>

                <button
                  type="button"
                  disabled={
                    runningId !==
                    null
                  }
                  onClick={() =>
                    void executeScenario(
                      scenario.scenarioId,
                    )
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Play size={15} />
                  )}

                  Execute scenario
                </button>
              </article>
            );
          },
        )}
      </div>

      {message ? (
        <div className="mx-5 mb-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}
EOF

echo "Creating daily report panel..."

cat > src/components/reports/daily-report-panel.tsx <<'EOF'
"use client";

import {
  Download,
  FileBarChart,
  LoaderCircle,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  DailyOperationalReport,
} from "@/types/operations";

import type {
  PlantState,
} from "@/types/hvac";

function extractState():
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

export function DailyReportPanel() {
  const energyHistory =
    useSimulationStore(
      (state) =>
        state.energyHistory,
    );

  const activeAlarms =
    useSimulationStore(
      (state) =>
        state.activeAlarms,
    );

  const [report, setReport] =
    useState<DailyOperationalReport | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  async function generateReport() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/reports/daily",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              state:
                extractState(),
              energySamples:
                energyHistory,
              alarms:
                activeAlarms,
              totalFlights: 0,
            }),
          },
        );

      const result =
        (await response.json()) as {
          success: boolean;
          report:
            DailyOperationalReport;
          error?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Report generation failed.",
        );
      }

      setReport(
        result.report,
      );
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    if (!report) return;

    const blob =
      new Blob(
        [
          JSON.stringify(
            report,
            null,
            2,
          ),
        ],
        {
          type:
            "application/json",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href = url;

    anchor.download =
      `lumi-daily-report-${report.reportDate}.json`;

    anchor.click();

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart
              size={20}
              className="text-cyan-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Daily Operational Report
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Executive HVAC performance summary
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void generateReport()
          }
          disabled={loading}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {loading
            ? "Generating..."
            : "Generate report"}
        </button>
      </header>

      <div className="p-5">
        {!report ? (
          <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
            {loading ? (
              <LoaderCircle
                size={24}
                className="animate-spin text-cyan-300"
              />
            ) : (
              "No report generated"
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Plant power
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {
                    report.totalPlantPowerKw
                  }{" "}
                  kW
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Energy
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {
                    report.totalEnergyKwh
                  }{" "}
                  kWh
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Average COP
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {
                    report.averageChillerCop
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Availability
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {
                    report.plantAvailabilityPercent
                  }
                  %
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Executive Summary
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {
                  report.executiveSummary
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                exportReport
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <Download size={15} />
              Export JSON
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
EOF

echo "Adding Part 9 panels to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/components/dashboard/plant-dashboard.tsx"
)

content = path.read_text()

imports = [
    'import { ScenarioPanel } from "@/components/simulation/scenario-panel";\n',
    'import { DailyReportPanel } from "@/components/reports/daily-report-panel";\n',
]

anchor = (
    'import { KpiCard } '
    'from "@/components/dashboard/kpi-card";\n'
)

for import_line in imports:
    if import_line not in content:
        content = content.replace(
            anchor,
            anchor + import_line,
        )

panel_block = '''
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
          <ScenarioPanel />
          <DailyReportPanel />
        </section>

'''

marker = (
    "        <FlightSchedulePanel />"
)

if (
    "<ScenarioPanel />"
    not in content
):
    content = content.replace(
        marker,
        panel_block + marker,
        1,
    )

path.write_text(content)
PYTHON

echo "Creating reporting documentation..."

cat > docs/reports/REPORTING_MODEL.md <<'EOF'
# Reporting Model

The reporting module provides an operational snapshot of the virtual airport
HVAC system.

## Daily report contents

- Current operating mode
- Flight and passenger context
- Running chillers
- Active AHUs
- Current plant power
- Accumulated virtual energy
- Warning and critical alarms
- Average chiller COP
- Plant availability
- Estimated energy savings
- Estimated carbon impact
- Executive summary

## Export

The dashboard currently exports daily reports as JSON. PDF and spreadsheet
export can be added in a later reporting phase.
EOF

echo "Formatting Part 9 files..."

npx prettier --write \
  src/types/operations.ts \
  src/data/demo/simulation-scenarios.ts \
  src/lib/scenarios/scenario-engine.ts \
  src/lib/reports/daily-report.ts \
  src/services/audit-repository.ts \
  src/app/api/scenarios/route.ts \
  src/app/api/scenarios/execute/route.ts \
  src/app/api/reports/daily/route.ts \
  src/app/api/audit/route.ts \
  src/components/simulation/scenario-panel.tsx \
  src/components/reports/daily-report-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  docs/reports/REPORTING_MODEL.md

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Staging Part 9 changes..."

git add \
  scripts/09-scenarios-reports-and-audit.sh \
  src/types/operations.ts \
  src/data/demo/simulation-scenarios.ts \
  src/lib/scenarios/scenario-engine.ts \
  src/lib/reports/daily-report.ts \
  src/services/audit-repository.ts \
  src/app/api/scenarios/route.ts \
  src/app/api/scenarios/execute/route.ts \
  src/app/api/reports/daily/route.ts \
  src/app/api/audit/route.ts \
  src/components/simulation/scenario-panel.tsx \
  src/components/reports/daily-report-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  docs/reports/REPORTING_MODEL.md

if git diff --cached --quiet; then
  echo "No new Part 9 changes to commit."
else
  git commit \
    -m "feat: add simulation scenarios operational reports and audit trail"

  git push
fi

echo
echo "============================================================"
echo "PART 9 COMPLETED SUCCESSFULLY"
echo "Scenarios, reports and audit trail are ready"
echo "============================================================"
echo
echo "Available APIs:"
echo "  GET  /api/scenarios"
echo "  POST /api/scenarios/execute"
echo "  POST /api/reports/daily"
echo "  GET  /api/audit"
echo "  POST /api/audit"
echo
echo "Dashboard features:"
echo "  Professional simulation scenario library"
echo "  Peak departure and heavy arrival scenarios"
echo "  Chiller failure and filter blockage scenarios"
echo "  Energy-reduction scenario"
echo "  Daily operational report generation"
echo "  JSON report export"
echo "  Server-side audit trail"
echo
