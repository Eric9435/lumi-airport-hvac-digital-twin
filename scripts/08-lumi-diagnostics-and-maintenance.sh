#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 8 FAILED"
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
echo "PART 8 — LUMI DIAGNOSTICS AND MAINTENANCE INTELLIGENCE"
echo "============================================================"

mkdir -p \
  src/types \
  src/lib/diagnostics \
  src/lib/maintenance \
  src/services \
  src/components/lumi \
  src/components/maintenance \
  src/app/api/lumi/analyze \
  src/app/api/maintenance/work-orders \
  src/app/api/recommendations \
  src/data/demo

echo "Creating diagnostic and maintenance types..."

cat > src/types/diagnostics.ts <<'EOF'
import type {
  AlarmLevel,
} from "@/types/hvac";

export type DiagnosticCategory =
  | "performance"
  | "energy"
  | "comfort"
  | "air-quality"
  | "maintenance"
  | "control"
  | "safety";

export type RecommendationStatus =
  | "new"
  | "reviewed"
  | "approved"
  | "rejected"
  | "executed";

export type MaintenancePriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "in-progress"
  | "completed"
  | "cancelled";

export interface DiagnosticFinding {
  findingId: string;
  detectedAt: string;
  equipmentId: string;
  equipmentName: string;
  zoneId: string | null;
  category: DiagnosticCategory;
  severity: AlarmLevel;
  title: string;
  summary: string;
  probableCauses: string[];
  evidence: string[];
  recommendedActions: string[];
  confidencePercent: number;
}

export interface LumiRecommendation {
  recommendationId: string;
  createdAt: string;
  equipmentId: string | null;
  zoneId: string | null;
  category: DiagnosticCategory;
  title: string;
  analysisSummary: string;
  recommendedAction: string;
  expectedImpact: string;
  estimatedEnergySavingPercent: number | null;
  comfortImpact:
    | "improve"
    | "neutral"
    | "reduce";
  riskLevel:
    | "low"
    | "medium"
    | "high"
    | "critical";
  confidencePercent: number;
  approvalRequired: boolean;
  status: RecommendationStatus;
}

export interface MaintenanceWorkOrder {
  workOrderId: string;
  createdAt: string;
  equipmentId: string;
  equipmentName: string;
  zoneId: string | null;
  source:
    | "lumi"
    | "alarm"
    | "operator"
    | "scheduled";
  sourceReferenceId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  assignedTo: string | null;
  plannedStart: string | null;
  actualStart: string | null;
  completedAt: string | null;
  status: WorkOrderStatus;
  inspectionResult: string;
  correctiveAction: string;
  estimatedCost: number | null;
  actualCost: number | null;
  remarks: string;
}

export interface PlantDiagnosticReport {
  generatedAt: string;
  overallHealthScore: number;
  operatingStatus:
    | "healthy"
    | "attention-required"
    | "degraded"
    | "critical";
  findings: DiagnosticFinding[];
  recommendations: LumiRecommendation[];
}
EOF

echo "Creating diagnostic engine..."

cat > src/lib/diagnostics/diagnostic-engine.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  HVAC_THRESHOLDS,
} from "@/lib/constants/thresholds";

import type {
  DiagnosticFinding,
  LumiRecommendation,
  PlantDiagnosticReport,
} from "@/types/diagnostics";

import type {
  PlantState,
} from "@/types/hvac";

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function createFinding(
  input:
    Omit<
      DiagnosticFinding,
      "findingId" | "detectedAt"
    >,
): DiagnosticFinding {
  return {
    findingId: randomUUID(),
    detectedAt:
      new Date().toISOString(),
    ...input,
  };
}

function createRecommendation(
  input:
    Omit<
      LumiRecommendation,
      "recommendationId" |
        "createdAt" |
        "status"
    >,
): LumiRecommendation {
  return {
    recommendationId:
      randomUUID(),

    createdAt:
      new Date().toISOString(),

    status: "new",

    ...input,
  };
}

export function analyzePlant(
  state: PlantState,
): PlantDiagnosticReport {
  const findings:
    DiagnosticFinding[] = [];

  const recommendations:
    LumiRecommendation[] = [];

  for (
    const chiller of
    state.chillers
  ) {
    if (
      chiller.status === "running" &&
      chiller.cop > 0 &&
      chiller.cop <
        HVAC_THRESHOLDS.chiller
          .minimumCop
    ) {
      findings.push(
        createFinding({
          equipmentId:
            chiller.id,

          equipmentName:
            chiller.name,

          zoneId: null,

          category:
            "performance",

          severity:
            "warning",

          title:
            "Low chiller efficiency",

          summary:
            `${chiller.id} is operating at COP ${chiller.cop}, below the configured minimum COP of ${HVAC_THRESHOLDS.chiller.minimumCop}.`,

          probableCauses: [
            "High condenser-water temperature",
            "Condenser fouling",
            "Reduced chilled-water flow",
            "Compressor efficiency degradation",
          ],

          evidence: [
            `Current COP: ${chiller.cop}`,
            `Condenser leaving temperature: ${chiller.condenserWaterLeavingTempC}°C`,
            `Chilled-water flow: ${chiller.chilledWaterFlowM3h} m³/h`,
          ],

          recommendedActions: [
            "Inspect condenser-water conditions",
            "Compare current flow against design flow",
            "Review compressor loading",
            "Schedule condenser inspection",
          ],

          confidencePercent: 88,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId:
            chiller.id,

          zoneId: null,

          category:
            "maintenance",

          title:
            `Inspect ${chiller.id} heat-transfer performance`,

          analysisSummary:
            "Reduced COP indicates that the chiller may be consuming more electrical power than expected for the delivered cooling output.",

          recommendedAction:
            "Inspect condenser approach, chilled-water flow, condenser-water flow and heat-exchanger cleanliness.",

          expectedImpact:
            "Improved chiller COP, reduced plant power and improved cooling stability.",

          estimatedEnergySavingPercent:
            6,

          comfortImpact:
            "improve",

          riskLevel:
            "medium",

          confidencePercent: 86,

          approvalRequired: false,
        }),
      );
    }

    if (
      chiller.status === "running" &&
      chiller.loadPercent >= 90
    ) {
      findings.push(
        createFinding({
          equipmentId:
            chiller.id,

          equipmentName:
            chiller.name,

          zoneId: null,

          category:
            "control",

          severity:
            "warning",

          title:
            "Chiller operating near maximum load",

          summary:
            `${chiller.id} is operating at ${chiller.loadPercent}% load.`,

          probableCauses: [
            "High terminal cooling demand",
            "Insufficient running chiller capacity",
            "Abnormal AHU cooling demand",
          ],

          evidence: [
            `Load: ${chiller.loadPercent}%`,
            `Plant expected passengers: ${state.expectedPassengers}`,
          ],

          recommendedActions: [
            "Review available standby chillers",
            "Evaluate automatic chiller staging",
            "Check upcoming flight demand",
          ],

          confidencePercent: 92,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: null,
          zoneId: null,
          category: "control",
          title:
            "Evaluate additional chiller staging",
          analysisSummary:
            "The current lead chiller is operating close to maximum load.",
          recommendedAction:
            "Start the next available standby chiller if demand remains high for the configured staging delay.",
          expectedImpact:
            "Reduced individual chiller loading and improved plant resilience.",
          estimatedEnergySavingPercent:
            null,
          comfortImpact:
            "improve",
          riskLevel:
            "medium",
          confidencePercent: 90,
          approvalRequired: true,
        }),
      );
    }
  }

  for (const ahu of state.ahus) {
    const airflowPercent =
      ahu.designAirflowCmh > 0
        ? (
            ahu.airflowCmh /
            ahu.designAirflowCmh
          ) *
          100
        : 0;

    if (
      ahu.status === "running" &&
      airflowPercent <
        HVAC_THRESHOLDS.ahu
          .airflowLowPercentOfDesign
    ) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "performance",
          severity: "warning",
          title:
            "AHU airflow below design target",
          summary:
            `${ahu.id} is delivering approximately ${airflowPercent.toFixed(1)}% of design airflow.`,
          probableCauses: [
            "Low fan speed command",
            "Dirty air filter",
            "Duct restriction",
            "Damper restriction",
          ],
          evidence: [
            `Current airflow: ${ahu.airflowCmh} CMH`,
            `Design airflow: ${ahu.designAirflowCmh} CMH`,
            `Fan speed: ${ahu.fanSpeedPercent}%`,
            `Filter differential pressure: ${ahu.filterDifferentialPressurePa} Pa`,
          ],
          recommendedActions: [
            "Review fan-speed command",
            "Inspect filter differential pressure",
            "Verify damper position",
            "Inspect duct restrictions",
          ],
          confidencePercent: 90,
        }),
      );
    }

    if (
      ahu.filterDifferentialPressurePa >=
      HVAC_THRESHOLDS.ahu
        .filterDpWarningPa
    ) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "maintenance",
          severity:
            ahu.filterDifferentialPressurePa >=
            HVAC_THRESHOLDS.ahu
              .filterDpCriticalPa
              ? "high"
              : "warning",
          title:
            "Air-filter restriction detected",
          summary:
            `${ahu.id} filter differential pressure is ${ahu.filterDifferentialPressurePa} Pa.`,
          probableCauses: [
            "Dust-loaded filter",
            "Improper filter installation",
            "Air-path obstruction",
          ],
          evidence: [
            `Filter differential pressure: ${ahu.filterDifferentialPressurePa} Pa`,
            `Warning threshold: ${HVAC_THRESHOLDS.ahu.filterDpWarningPa} Pa`,
          ],
          recommendedActions: [
            "Inspect filter condition",
            "Replace filter if required",
            "Verify airflow after maintenance",
          ],
          confidencePercent: 95,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: ahu.id,
          zoneId: ahu.zoneId,
          category: "maintenance",
          title:
            `Inspect ${ahu.id} air filter`,
          analysisSummary:
            "Filter differential pressure has exceeded the configured maintenance threshold.",
          recommendedAction:
            "Create a filter inspection work order and verify post-maintenance airflow.",
          expectedImpact:
            "Improved airflow, lower fan power and improved zone comfort.",
          estimatedEnergySavingPercent: 4,
          comfortImpact: "improve",
          riskLevel:
            ahu.filterDifferentialPressurePa >=
            HVAC_THRESHOLDS.ahu
              .filterDpCriticalPa
              ? "high"
              : "medium",
          confidencePercent: 95,
          approvalRequired: false,
        }),
      );
    }

    if (
      ahu.co2Ppm >=
      HVAC_THRESHOLDS.ahu
        .co2WarningPpm
    ) {
      findings.push(
        createFinding({
          equipmentId: ahu.id,
          equipmentName: ahu.name,
          zoneId: ahu.zoneId,
          category: "air-quality",
          severity:
            ahu.co2Ppm >=
            HVAC_THRESHOLDS.ahu
              .co2CriticalPpm
              ? "critical"
              : "warning",
          title:
            "Ventilation demand exceeds current outdoor-air supply",
          summary:
            `${ahu.zoneName} CO₂ concentration is ${ahu.co2Ppm} ppm.`,
          probableCauses: [
            "High passenger occupancy",
            "Insufficient outdoor-air percentage",
            "Damper restriction",
          ],
          evidence: [
            `CO₂: ${ahu.co2Ppm} ppm`,
            `Occupancy: ${ahu.occupancy}`,
            `Outdoor air: ${ahu.outdoorAirPercent}%`,
          ],
          recommendedActions: [
            "Increase outdoor-air percentage",
            "Inspect outdoor-air damper",
            "Review occupancy forecast",
          ],
          confidencePercent: 91,
        }),
      );

      recommendations.push(
        createRecommendation({
          equipmentId: ahu.id,
          zoneId: ahu.zoneId,
          category: "air-quality",
          title:
            `Increase ventilation for ${ahu.zoneName}`,
          analysisSummary:
            "The current CO₂ level indicates insufficient ventilation relative to occupancy.",
          recommendedAction:
            "Increase outdoor-air damper position within safe humidity and energy limits.",
          expectedImpact:
            "Improved indoor air quality and passenger comfort.",
          estimatedEnergySavingPercent: null,
          comfortImpact: "improve",
          riskLevel:
            ahu.co2Ppm >=
            HVAC_THRESHOLDS.ahu
              .co2CriticalPpm
              ? "high"
              : "medium",
          confidencePercent: 90,
          approvalRequired: true,
        }),
      );
    }
  }

  const criticalCount =
    findings.filter(
      (finding) =>
        finding.severity === "critical",
    ).length;

  const highCount =
    findings.filter(
      (finding) =>
        finding.severity === "high",
    ).length;

  const warningCount =
    findings.filter(
      (finding) =>
        finding.severity === "warning",
    ).length;

  const healthPenalty =
    criticalCount * 25 +
    highCount * 15 +
    warningCount * 6;

  const overallHealthScore =
    clamp(
      100 - healthPenalty,
      0,
      100,
    );

  const operatingStatus =
    criticalCount > 0
      ? "critical"
      : highCount > 0
        ? "degraded"
        : warningCount > 0
          ? "attention-required"
          : "healthy";

  return {
    generatedAt:
      new Date().toISOString(),

    overallHealthScore,

    operatingStatus,

    findings,

    recommendations,
  };
}
EOF

echo "Creating maintenance work-order service..."

cat > src/lib/maintenance/work-order-factory.ts <<'EOF'
import { randomUUID } from "node:crypto";

import type {
  DiagnosticFinding,
  MaintenancePriority,
  MaintenanceWorkOrder,
} from "@/types/diagnostics";

function priorityFromSeverity(
  severity:
    DiagnosticFinding["severity"],
): MaintenancePriority {
  switch (severity) {
    case "critical":
      return "critical";

    case "high":
      return "high";

    case "warning":
      return "medium";

    default:
      return "low";
  }
}

export function createWorkOrderFromFinding(
  finding: DiagnosticFinding,
): MaintenanceWorkOrder {
  return {
    workOrderId: randomUUID(),

    createdAt:
      new Date().toISOString(),

    equipmentId:
      finding.equipmentId,

    equipmentName:
      finding.equipmentName,

    zoneId:
      finding.zoneId,

    source: "lumi",

    sourceReferenceId:
      finding.findingId,

    title:
      finding.title,

    description:
      `${finding.summary}\n\nRecommended actions:\n${finding.recommendedActions.join("\n")}`,

    priority:
      priorityFromSeverity(
        finding.severity,
      ),

    assignedTo: null,

    plannedStart: null,

    actualStart: null,

    completedAt: null,

    status: "open",

    inspectionResult: "",

    correctiveAction: "",

    estimatedCost: null,

    actualCost: null,

    remarks:
      `LUMI confidence: ${finding.confidencePercent}%`,
  };
}
EOF

echo "Creating demo work-order repository..."

cat > src/services/work-order-repository.ts <<'EOF'
import type {
  MaintenanceWorkOrder,
} from "@/types/diagnostics";

const workOrders:
  MaintenanceWorkOrder[] = [];

export function listWorkOrders():
  MaintenanceWorkOrder[] {
  return [...workOrders];
}

export function createWorkOrder(
  workOrder: MaintenanceWorkOrder,
): MaintenanceWorkOrder {
  workOrders.unshift(workOrder);

  return workOrder;
}

export function updateWorkOrderStatus(
  workOrderId: string,
  status:
    MaintenanceWorkOrder["status"],
): MaintenanceWorkOrder | null {
  const workOrder =
    workOrders.find(
      (record) =>
        record.workOrderId ===
        workOrderId,
    );

  if (!workOrder) {
    return null;
  }

  workOrder.status = status;

  if (
    status === "in-progress" &&
    !workOrder.actualStart
  ) {
    workOrder.actualStart =
      new Date().toISOString();
  }

  if (status === "completed") {
    workOrder.completedAt =
      new Date().toISOString();
  }

  return workOrder;
}
EOF

echo "Creating LUMI diagnostic API..."

cat > src/app/api/lumi/analyze/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  analyzePlant,
} from "@/lib/diagnostics/diagnostic-engine";

import type {
  PlantState,
} from "@/types/hvac";

const requestSchema =
  z.object({
    state: z.unknown(),
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
      analyzePlant(
        body.state as PlantState,
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
            : "Plant analysis failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating recommendations API..."

cat > src/app/api/recommendations/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  analyzePlant,
} from "@/lib/diagnostics/diagnostic-engine";

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

    const report =
      analyzePlant(
        body.state,
      );

    return NextResponse.json({
      success: true,

      generatedAt:
        report.generatedAt,

      healthScore:
        report.overallHealthScore,

      recommendations:
        report.recommendations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Recommendation generation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating maintenance work-order API..."

cat > src/app/api/maintenance/work-orders/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  createWorkOrderFromFinding,
} from "@/lib/maintenance/work-order-factory";

import {
  createWorkOrder,
  listWorkOrders,
  updateWorkOrderStatus,
} from "@/services/work-order-repository";

import type {
  DiagnosticFinding,
} from "@/types/diagnostics";

const statusSchema =
  z.enum([
    "open",
    "assigned",
    "in-progress",
    "completed",
    "cancelled",
  ]);

export async function GET() {
  return NextResponse.json({
    success: true,

    workOrders:
      listWorkOrders(),
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        finding:
          DiagnosticFinding;
      };

    const workOrder =
      createWorkOrder(
        createWorkOrderFromFinding(
          body.finding,
        ),
      );

    return NextResponse.json(
      {
        success: true,
        workOrder,
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
            : "Work-order creation failed.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as {
        workOrderId: string;
        status: string;
      };

    const status =
      statusSchema.parse(
        body.status,
      );

    const workOrder =
      updateWorkOrderStatus(
        body.workOrderId,
        status,
      );

    if (!workOrder) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Work order was not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      workOrder,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Work-order update failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating LUMI intelligence panel..."

cat > src/components/lumi/lumi-intelligence-panel.tsx <<'EOF'
"use client";

import {
  BrainCircuit,
  CheckCircle2,
  ClipboardPlus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";

import {
  useCallback,
  useState,
} from "react";

import {
  analyzePlant,
} from "@/lib/diagnostics/diagnostic-engine";

import {
  useSimulationStore,
} from "@/store/simulation-store";

import type {
  DiagnosticFinding,
  MaintenanceWorkOrder,
  PlantDiagnosticReport,
} from "@/types/diagnostics";

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

function healthClass(
  status:
    PlantDiagnosticReport["operatingStatus"],
): string {
  switch (status) {
    case "healthy":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

    case "attention-required":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    case "degraded":
      return "border-orange-500/40 bg-orange-500/10 text-orange-300";

    case "critical":
      return "border-red-500/40 bg-red-500/10 text-red-300";
  }
}

export function LumiIntelligencePanel() {
  const [report, setReport] =
    useState<PlantDiagnosticReport | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const analyze = useCallback(() => {
    setLoading(true);
    setMessage(null);

    try {
      const result =
        analyzePlant(
          extractPlantState(),
        );

      setReport(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkOrder =
    useCallback(
      async (
        finding:
          DiagnosticFinding,
      ) => {
        setMessage(null);

        const response =
          await fetch(
            "/api/maintenance/work-orders",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                finding,
              }),
            },
          );

        const result =
          (await response.json()) as {
            success: boolean;
            workOrder?:
              MaintenanceWorkOrder;
            error?: string;
          };

        if (!response.ok || !result.success) {
          setMessage(
            result.error ??
              "Work-order creation failed.",
          );

          return;
        }

        setMessage(
          `Work order ${result.workOrder?.workOrderId ?? ""} created for ${finding.equipmentId}.`,
        );
      },
      [],
    );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit
              size={21}
              className="text-violet-300"
            />

            <h2 className="text-lg font-semibold text-white">
              LUMI Intelligence
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Plant diagnostics, recommendations
            and maintenance intelligence
          </p>
        </div>

        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw
              size={16}
              className="animate-spin"
            />
          ) : (
            <Sparkles size={16} />
          )}

          Analyze plant
        </button>
      </header>

      <div className="p-5">
        {!report ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <BrainCircuit
              size={38}
              className="text-slate-600"
            />

            <p className="mt-4 font-medium text-slate-300">
              Plant analysis has not been run
            </p>

            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              LUMI will examine chiller efficiency,
              AHU airflow, filter pressure, indoor air
              quality, plant demand and operating
              conditions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Health score
                </p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.overallHealthScore}
                  <span className="text-base text-slate-500">
                    /100
                  </span>
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Findings
                </p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.findings.length}
                </p>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-500">
                  Recommendations
                </p>

                <p className="mt-2 text-3xl font-semibold text-white">
                  {report.recommendations.length}
                </p>
              </article>
            </div>

            <div
              className={[
                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                healthClass(
                  report.operatingStatus,
                ),
              ].join(" ")}
            >
              {report.operatingStatus.replaceAll(
                "-",
                " ",
              )}
            </div>

            {report.findings.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2
                  size={22}
                  className="text-emerald-300"
                />

                <div>
                  <p className="font-medium text-emerald-200">
                    No diagnostic issues detected
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Current virtual plant values are
                    within configured diagnostic limits.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {report.findings.map(
                  (finding) => (
                    <article
                      key={finding.findingId}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
                            <ShieldAlert
                              size={17}
                              className="text-amber-300"
                            />
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              {finding.equipmentId} ·{" "}
                              {finding.title}
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              {finding.summary}
                            </p>

                            <p className="mt-3 text-xs text-slate-500">
                              Confidence:{" "}
                              {finding.confidencePercent}%
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void createWorkOrder(
                              finding,
                            )
                          }
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20"
                        >
                          <ClipboardPlus size={14} />
                          Create work order
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Probable causes
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {finding.probableCauses.map(
                              (cause) => (
                                <li key={cause}>
                                  • {cause}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Recommended actions
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-slate-400">
                            {finding.recommendedActions.map(
                              (action) => (
                                <li key={action}>
                                  • {action}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}

            {report.recommendations.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Wrench
                    size={18}
                    className="text-cyan-300"
                  />

                  <h3 className="font-semibold text-white">
                    Recommended Actions
                  </h3>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {report.recommendations.map(
                    (recommendation) => (
                      <article
                        key={
                          recommendation.recommendationId
                        }
                        className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
                      >
                        <p className="font-medium text-cyan-200">
                          {recommendation.title}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {
                            recommendation.recommendedAction
                          }
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>
                            Confidence:{" "}
                            {
                              recommendation.confidencePercent
                            }
                            %
                          </span>

                          <span>·</span>

                          <span className="capitalize">
                            Risk:{" "}
                            {
                              recommendation.riskLevel
                            }
                          </span>

                          {recommendation
                            .estimatedEnergySavingPercent !==
                          null ? (
                            <>
                              <span>·</span>

                              <span>
                                Estimated saving:{" "}
                                {
                                  recommendation.estimatedEnergySavingPercent
                                }
                                %
                              </span>
                            </>
                          ) : null}
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {message ? (
          <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            {message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
EOF

echo "Creating maintenance work-order panel..."

cat > src/components/maintenance/work-order-panel.tsx <<'EOF'
"use client";

import {
  ClipboardList,
  RefreshCw,
  Wrench,
} from "lucide-react";

import {
  useCallback,
  useState,
} from "react";

import type {
  MaintenanceWorkOrder,
} from "@/types/diagnostics";

export function WorkOrderPanel() {
  const [workOrders, setWorkOrders] =
    useState<MaintenanceWorkOrder[]>([]);

  const [loading, setLoading] =
    useState(false);

  const loadWorkOrders =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/maintenance/work-orders",
            {
              cache: "no-store",
            },
          );

        const result =
          (await response.json()) as {
            success: boolean;
            workOrders:
              MaintenanceWorkOrder[];
          };

        setWorkOrders(
          result.workOrders ?? [],
        );
      } finally {
        setLoading(false);
      }
    }, []);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex items-center justify-between border-b border-slate-800 p-5">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList
              size={20}
              className="text-cyan-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Maintenance Work Orders
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            LUMI-generated inspection and
            corrective-maintenance tasks
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadWorkOrders()
          }
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          aria-label="Reload work orders"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
        </button>
      </header>

      <div className="p-5">
        {workOrders.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-6 text-center">
            <Wrench
              size={32}
              className="text-slate-600"
            />

            <p className="mt-3 font-medium text-slate-300">
              No work orders loaded
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create a work order from a LUMI
              diagnostic finding, then refresh this panel.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workOrders.map(
              (workOrder) => (
                <article
                  key={
                    workOrder.workOrderId
                  }
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {
                          workOrder.equipmentId
                        }{" "}
                        · {workOrder.title}
                      </p>

                      <p className="mt-2 text-sm text-slate-400">
                        {
                          workOrder.description
                        }
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs capitalize text-amber-300">
                        {
                          workOrder.priority
                        }
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs capitalize text-slate-300">
                        {
                          workOrder.status
                        }
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600">
                    Work order:{" "}
                    {
                      workOrder.workOrderId
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
EOF

echo "Adding LUMI intelligence and maintenance panels to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/components/dashboard/plant-dashboard.tsx"
)

content = path.read_text()

imports = [
    'import { LumiIntelligencePanel } from "@/components/lumi/lumi-intelligence-panel";\n',
    'import { WorkOrderPanel } from "@/components/maintenance/work-order-panel";\n',
]

anchor = (
    'import { LumiCommandConsole } '
    'from "@/components/lumi/lumi-command-console";\n'
)

for import_line in imports:
    if import_line not in content:
        content = content.replace(
            anchor,
            anchor + import_line,
        )

panel_block = '''
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
          <LumiIntelligencePanel />
          <WorkOrderPanel />
        </section>

'''

marker = "        <FlightSchedulePanel />"

if (
    "<LumiIntelligencePanel />"
    not in content
):
    content = content.replace(
        marker,
        panel_block + marker,
        1,
    )

path.write_text(content)
PYTHON

echo "Formatting Part 8 files..."

npx prettier --write \
  src/types/diagnostics.ts \
  src/lib/diagnostics/diagnostic-engine.ts \
  src/lib/maintenance/work-order-factory.ts \
  src/services/work-order-repository.ts \
  src/app/api/lumi/analyze/route.ts \
  src/app/api/recommendations/route.ts \
  src/app/api/maintenance/work-orders/route.ts \
  src/components/lumi/lumi-intelligence-panel.tsx \
  src/components/maintenance/work-order-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Staging Part 8 changes..."

git add \
  scripts/08-lumi-diagnostics-and-maintenance.sh \
  src/types/diagnostics.ts \
  src/lib/diagnostics/diagnostic-engine.ts \
  src/lib/maintenance/work-order-factory.ts \
  src/services/work-order-repository.ts \
  src/app/api/lumi/analyze/route.ts \
  src/app/api/recommendations/route.ts \
  src/app/api/maintenance/work-orders/route.ts \
  src/components/lumi/lumi-intelligence-panel.tsx \
  src/components/maintenance/work-order-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx

if git diff --cached --quiet; then
  echo "No new Part 8 changes to commit."
else
  git commit \
    -m "feat: add LUMI diagnostics recommendations and maintenance intelligence"

  git push
fi

echo
echo "============================================================"
echo "PART 8 COMPLETED SUCCESSFULLY"
echo "LUMI diagnostics and maintenance intelligence are ready"
echo "============================================================"
echo
echo "Available APIs:"
echo "  POST /api/lumi/analyze"
echo "  POST /api/recommendations"
echo "  GET  /api/maintenance/work-orders"
echo "  POST /api/maintenance/work-orders"
echo "  PATCH /api/maintenance/work-orders"
echo
echo "Dashboard features:"
echo "  Plant health score"
echo "  Diagnostic findings"
echo "  Probable causes"
echo "  Recommended actions"
echo "  Confidence scoring"
echo "  Energy-saving recommendations"
echo "  Maintenance work-order creation"
echo
