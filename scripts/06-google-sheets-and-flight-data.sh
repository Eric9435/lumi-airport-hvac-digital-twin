#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 6 FAILED"
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
  echo "Complete Part 4 before running Part 6." >&2
  exit 1
fi

if [[ ! -f src/store/simulation-store.ts ]]; then
  echo "ERROR: Runtime simulation store was not found." >&2
  echo "Complete Part 5 before running Part 6." >&2
  exit 1
fi

echo "============================================================"
echo "PART 6 — GOOGLE SHEETS, FLIGHTS AND PERSISTENCE"
echo "============================================================"

mkdir -p \
  src/types \
  src/lib/google-sheets \
  src/lib/validation \
  src/services \
  src/data/demo \
  src/app/api/flights \
  src/app/api/flights/today \
  src/app/api/persistence/state \
  src/app/api/persistence/command \
  src/components/flights \
  src/hooks \
  docs/google-apps-script

echo "Creating persistent data types..."

cat > src/types/persistence.ts <<'EOF'
import type {
  AlarmLevel,
  PlantState,
} from "@/types/hvac";

export type FlightMovementType =
  | "arrival"
  | "departure";

export type FlightOperationalStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "arrived"
  | "delayed"
  | "cancelled";

export interface FlightScheduleRecord {
  flightId: string;
  date: string;
  flightNumber: string;
  airline: string;
  movementType: FlightMovementType;
  scheduledTime: string;
  estimatedTime: string | null;
  actualTime: string | null;
  terminal: string;
  gate: string;
  aircraftType: string;
  expectedPassengers: number;
  actualPassengers: number | null;
  status: FlightOperationalStatus;
  linkedZoneIds: string[];
  remarks: string;
}

export interface CommandLogRecord {
  commandId: string;
  requestedAt: string;
  requestedBy: string;
  commandSource:
    | "lumi"
    | "dashboard"
    | "automatic"
    | "system";
  rawCommand: string;
  action: string;
  equipmentId: string | null;
  parameter: string | null;
  oldValue: string | number | boolean | null;
  requestedValue:
    | string
    | number
    | boolean
    | null;
  unit: string | null;
  reason: string;
  approvalRequired: boolean;
  approvalStatus:
    | "not-required"
    | "pending"
    | "approved"
    | "rejected";
  executionStatus:
    | "pending"
    | "executed"
    | "failed"
    | "cancelled";
  resultMessage: string;
  executedAt: string | null;
}

export interface AlertRecord {
  alertId: string;
  detectedAt: string;
  equipmentId: string;
  zoneId: string | null;
  parameter: string;
  measuredValue: number | string;
  normalMinimum: number | null;
  normalMaximum: number | null;
  alarmLevel: AlarmLevel;
  alarmCode: string;
  alertMessage: string;
  probableCause: string;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNote: string;
}

export interface StateSnapshotRecord {
  snapshotId: string;
  timestamp: string;
  source:
    | "simulation"
    | "lumi"
    | "dashboard"
    | "system";
  state: PlantState;
}

export interface AppsScriptRequest<T = unknown> {
  action: string;
  requestId: string;
  timestamp: string;
  apiKey?: string;
  payload?: T;
}

export interface AppsScriptResponse<T = unknown> {
  success: boolean;
  requestId?: string;
  timestamp?: string;
  data?: T;
  error?: string;
}
EOF

echo "Creating validation schemas..."

cat > src/lib/validation/persistence.ts <<'EOF'
import { z } from "zod";

export const flightScheduleRecordSchema =
  z.object({
    flightId: z.string().min(1),
    date: z.string().min(10),
    flightNumber: z.string().min(2),
    airline: z.string().min(1),
    movementType: z.enum([
      "arrival",
      "departure",
    ]),
    scheduledTime: z.string().min(5),
    estimatedTime:
      z.string().nullable(),
    actualTime:
      z.string().nullable(),
    terminal: z.string().min(1),
    gate: z.string().min(1),
    aircraftType: z.string().min(1),
    expectedPassengers:
      z.number().int().min(0),
    actualPassengers:
      z.number().int().min(0).nullable(),
    status: z.enum([
      "scheduled",
      "boarding",
      "departed",
      "arrived",
      "delayed",
      "cancelled",
    ]),
    linkedZoneIds:
      z.array(z.string()),
    remarks: z.string(),
  });

export const flightScheduleArraySchema =
  z.array(flightScheduleRecordSchema);

export const stateSyncRequestSchema =
  z.object({
    source: z.enum([
      "simulation",
      "lumi",
      "dashboard",
      "system",
    ]),
    state: z.unknown(),
  });

export const commandLogRequestSchema =
  z.object({
    requestedBy:
      z.string().min(1).max(100),
    commandSource: z.enum([
      "lumi",
      "dashboard",
      "automatic",
      "system",
    ]),
    rawCommand:
      z.string().min(1).max(500),
    action:
      z.string().min(1).max(100),
    equipmentId:
      z.string().nullable(),
    parameter:
      z.string().nullable(),
    oldValue:
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
      ]).nullable(),
    requestedValue:
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
      ]).nullable(),
    unit:
      z.string().nullable(),
    reason:
      z.string().max(1000),
    executionStatus: z.enum([
      "pending",
      "executed",
      "failed",
      "cancelled",
    ]),
    resultMessage:
      z.string().max(2000),
  });
EOF

echo "Creating demo flight schedule..."

cat > src/data/demo/flight-schedule.ts <<'EOF'
import type {
  FlightScheduleRecord,
} from "@/types/persistence";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDemoFlightSchedule():
  FlightScheduleRecord[] {
  const date = todayDate();

  return [
    {
      flightId: `${date}-SQ761`,
      date,
      flightNumber: "SQ761",
      airline: "Singapore Airlines",
      movementType: "arrival",
      scheduledTime: "06:30",
      estimatedTime: "06:35",
      actualTime: null,
      terminal: "T1",
      gate: "A01",
      aircraftType: "Airbus A350",
      expectedPassengers: 280,
      actualPassengers: null,
      status: "scheduled",
      linkedZoneIds: [
        "ZONE-ARRIVAL",
        "ZONE-IMMIGRATION",
        "ZONE-BAGGAGE",
      ],
      remarks: "",
    },
    {
      flightId: `${date}-TG305`,
      date,
      flightNumber: "TG305",
      airline: "Thai Airways",
      movementType: "arrival",
      scheduledTime: "08:10",
      estimatedTime: "08:10",
      actualTime: null,
      terminal: "T1",
      gate: "A03",
      aircraftType: "Airbus A330",
      expectedPassengers: 250,
      actualPassengers: null,
      status: "scheduled",
      linkedZoneIds: [
        "ZONE-ARRIVAL",
        "ZONE-IMMIGRATION",
        "ZONE-BAGGAGE",
      ],
      remarks: "",
    },
    {
      flightId: `${date}-AK504`,
      date,
      flightNumber: "AK504",
      airline: "AirAsia",
      movementType: "departure",
      scheduledTime: "09:20",
      estimatedTime: "09:20",
      actualTime: null,
      terminal: "T1",
      gate: "B02",
      aircraftType: "Airbus A320",
      expectedPassengers: 180,
      actualPassengers: null,
      status: "boarding",
      linkedZoneIds: [
        "ZONE-CHECKIN",
        "ZONE-DEPARTURE",
      ],
      remarks: "",
    },
    {
      flightId: `${date}-8M331`,
      date,
      flightNumber: "8M331",
      airline: "Myanmar Airways International",
      movementType: "departure",
      scheduledTime: "11:00",
      estimatedTime: "11:00",
      actualTime: null,
      terminal: "T1",
      gate: "B04",
      aircraftType: "Airbus A319",
      expectedPassengers: 140,
      actualPassengers: null,
      status: "scheduled",
      linkedZoneIds: [
        "ZONE-CHECKIN",
        "ZONE-DEPARTURE",
      ],
      remarks: "",
    },
    {
      flightId: `${date}-MH740`,
      date,
      flightNumber: "MH740",
      airline: "Malaysia Airlines",
      movementType: "arrival",
      scheduledTime: "13:15",
      estimatedTime: "13:35",
      actualTime: null,
      terminal: "T1",
      gate: "A05",
      aircraftType: "Boeing 737-800",
      expectedPassengers: 220,
      actualPassengers: null,
      status: "delayed",
      linkedZoneIds: [
        "ZONE-ARRIVAL",
        "ZONE-IMMIGRATION",
        "ZONE-BAGGAGE",
      ],
      remarks: "Estimated delay: 20 minutes",
    },
    {
      flightId: `${date}-SQ762`,
      date,
      flightNumber: "SQ762",
      airline: "Singapore Airlines",
      movementType: "departure",
      scheduledTime: "15:30",
      estimatedTime: "15:30",
      actualTime: null,
      terminal: "T1",
      gate: "B06",
      aircraftType: "Airbus A350",
      expectedPassengers: 310,
      actualPassengers: null,
      status: "scheduled",
      linkedZoneIds: [
        "ZONE-CHECKIN",
        "ZONE-DEPARTURE",
      ],
      remarks: "",
    },
  ];
}

export const demoFlightSchedule =
  createDemoFlightSchedule();
EOF

echo "Creating Google Apps Script client..."

cat > src/lib/google-sheets/client.ts <<'EOF'
import { randomUUID } from "node:crypto";

import type {
  AppsScriptRequest,
  AppsScriptResponse,
} from "@/types/persistence";

interface AppsScriptClientOptions {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class AppsScriptClient {
  private readonly endpoint?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(
    options: AppsScriptClientOptions = {},
  ) {
    this.endpoint =
      options.endpoint ??
      process.env.GOOGLE_APPS_SCRIPT_URL;

    this.apiKey =
      options.apiKey ??
      process.env.GOOGLE_APPS_SCRIPT_API_KEY;

    this.timeoutMs =
      options.timeoutMs ?? 15000;
  }

  get configured(): boolean {
    return Boolean(this.endpoint);
  }

  async request<TResponse, TPayload = unknown>(
    action: string,
    payload?: TPayload,
  ): Promise<TResponse> {
    if (!this.endpoint) {
      throw new Error(
        "GOOGLE_APPS_SCRIPT_URL is not configured.",
      );
    }

    const requestId = randomUUID();

    const body: AppsScriptRequest<TPayload> = {
      action,
      requestId,
      timestamp: new Date().toISOString(),
      apiKey: this.apiKey,
      payload,
    };

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(
        this.endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Apps Script request failed with HTTP ${response.status}.`,
        );
      }

      const result =
        (await response.json()) as
          AppsScriptResponse<TResponse>;

      if (!result.success) {
        throw new Error(
          result.error ??
            "Apps Script returned an unknown error.",
        );
      }

      if (result.data === undefined) {
        throw new Error(
          "Apps Script response did not include data.",
        );
      }

      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const appsScriptClient =
  new AppsScriptClient();
EOF

echo "Creating flight repository..."

cat > src/services/flight-repository.ts <<'EOF'
import {
  demoFlightSchedule,
} from "@/data/demo/flight-schedule";

import {
  appsScriptClient,
} from "@/lib/google-sheets/client";

import {
  flightScheduleArraySchema,
} from "@/lib/validation/persistence";

import type {
  FlightScheduleRecord,
} from "@/types/persistence";

export interface FlightRepositoryResult {
  source: "google-sheets" | "demo";
  flights: FlightScheduleRecord[];
}

export async function getTodayFlights():
  Promise<FlightRepositoryResult> {
  if (!appsScriptClient.configured) {
    return {
      source: "demo",
      flights: demoFlightSchedule,
    };
  }

  try {
    const result =
      await appsScriptClient.request<
        unknown,
        { date: string }
      >(
        "getTodayFlights",
        {
          date:
            new Date()
              .toISOString()
              .slice(0, 10),
        },
      );

    return {
      source: "google-sheets",
      flights:
        flightScheduleArraySchema.parse(
          result,
        ),
    };
  } catch (error) {
    console.error(
      "Google Sheets flight load failed. Falling back to demo data.",
      error,
    );

    return {
      source: "demo",
      flights: demoFlightSchedule,
    };
  }
}
EOF

echo "Creating persistence service..."

cat > src/services/persistence.service.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  appsScriptClient,
} from "@/lib/google-sheets/client";

import type {
  CommandLogRecord,
  PlantState,
  StateSnapshotRecord,
} from "@/types/persistence";

export async function savePlantSnapshot(
  state: PlantState,
  source:
    | "simulation"
    | "lumi"
    | "dashboard"
    | "system",
): Promise<{
  persisted: boolean;
  snapshotId: string;
}> {
  const snapshot: StateSnapshotRecord = {
    snapshotId: randomUUID(),
    timestamp: new Date().toISOString(),
    source,
    state,
  };

  if (!appsScriptClient.configured) {
    return {
      persisted: false,
      snapshotId: snapshot.snapshotId,
    };
  }

  await appsScriptClient.request(
    "savePlantSnapshot",
    snapshot,
  );

  return {
    persisted: true,
    snapshotId: snapshot.snapshotId,
  };
}

export async function saveCommandLog(
  command:
    Omit<
      CommandLogRecord,
      "commandId" | "requestedAt"
    >,
): Promise<{
  persisted: boolean;
  commandId: string;
}> {
  const record: CommandLogRecord = {
    commandId: randomUUID(),
    requestedAt:
      new Date().toISOString(),
    ...command,
  };

  if (!appsScriptClient.configured) {
    return {
      persisted: false,
      commandId: record.commandId,
    };
  }

  await appsScriptClient.request(
    "saveCommandLog",
    record,
  );

  return {
    persisted: true,
    commandId: record.commandId,
  };
}
EOF

echo "Creating flights API..."

cat > src/app/api/flights/today/route.ts <<'EOF'
import { NextResponse } from "next/server";

import {
  getTodayFlights,
} from "@/services/flight-repository";

export async function GET() {
  const result =
    await getTodayFlights();

  const expectedPassengers =
    result.flights.reduce(
      (total, flight) =>
        total +
        flight.expectedPassengers,
      0,
    );

  return NextResponse.json({
    success: true,
    source: result.source,
    date:
      new Date()
        .toISOString()
        .slice(0, 10),
    totalFlights:
      result.flights.length,
    expectedPassengers,
    flights: result.flights,
  });
}
EOF

cat > src/app/api/flights/route.ts <<'EOF'
export {
  GET,
} from "@/app/api/flights/today/route";
EOF

echo "Creating state persistence API..."

cat > src/app/api/persistence/state/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  stateSyncRequestSchema,
} from "@/lib/validation/persistence";

import {
  savePlantSnapshot,
} from "@/services/persistence.service";

import type {
  PlantState,
} from "@/types/hvac";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      stateSyncRequestSchema.parse(
        await request.json(),
      );

    const result =
      await savePlantSnapshot(
        body.state as PlantState,
        body.source,
      );

    return NextResponse.json({
      success: true,
      ...result,
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
            : "State persistence failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating command log API..."

cat > src/app/api/persistence/command/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  commandLogRequestSchema,
} from "@/lib/validation/persistence";

import {
  saveCommandLog,
} from "@/services/persistence.service";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      commandLogRequestSchema.parse(
        await request.json(),
      );

    const result =
      await saveCommandLog({
        ...body,
        approvalRequired: false,
        approvalStatus:
          "not-required",
        executedAt:
          body.executionStatus ===
          "executed"
            ? new Date().toISOString()
            : null,
      });

    return NextResponse.json({
      success: true,
      ...result,
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
            : "Command logging failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating client-side flight hook..."

cat > src/hooks/use-flight-schedule.ts <<'EOF'
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  FlightScheduleRecord,
} from "@/types/persistence";

interface FlightScheduleState {
  loading: boolean;
  error: string | null;
  source:
    | "google-sheets"
    | "demo"
    | null;
  expectedPassengers: number;
  flights: FlightScheduleRecord[];
}

export function useFlightSchedule() {
  const [state, setState] =
    useState<FlightScheduleState>({
      loading: true,
      error: null,
      source: null,
      expectedPassengers: 0,
      flights: [],
    });

  const loadFlights =
    useCallback(async () => {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch(
          "/api/flights/today",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Flight API returned HTTP ${response.status}.`,
          );
        }

        const result =
          (await response.json()) as {
            source:
              | "google-sheets"
              | "demo";
            expectedPassengers: number;
            flights:
              FlightScheduleRecord[];
          };

        setState({
          loading: false,
          error: null,
          source: result.source,
          expectedPassengers:
            result.expectedPassengers,
          flights: result.flights,
        });
      } catch (error) {
        setState({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Flight schedule failed to load.",
          source: null,
          expectedPassengers: 0,
          flights: [],
        });
      }
    }, []);

  useEffect(() => {
    void loadFlights();
  }, [loadFlights]);

  return {
    ...state,
    reload: loadFlights,
  };
}
EOF

echo "Creating flight schedule panel..."

cat > src/components/flights/flight-schedule-panel.tsx <<'EOF'
"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Plane,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  useFlightSchedule,
} from "@/hooks/use-flight-schedule";

function statusClass(
  status: string,
): string {
  switch (status) {
    case "boarding":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";

    case "delayed":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";

    case "cancelled":
      return "border-red-500/40 bg-red-500/10 text-red-300";

    case "arrived":
    case "departed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

export function FlightSchedulePanel() {
  const {
    loading,
    error,
    source,
    expectedPassengers,
    flights,
    reload,
  } = useFlightSchedule();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Plane
              size={20}
              className="text-cyan-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Today&apos;s Flight Operations
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Flight-aware HVAC demand context
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
            <p className="text-xs text-slate-500">
              Expected passengers
            </p>

            <p className="font-semibold text-white">
              {expectedPassengers.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Reload flights"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </header>

      <div className="p-5">
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!error && loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading flight schedule...
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                Source:{" "}
                {source ===
                "google-sheets"
                  ? "Google Sheets"
                  : "Demo dataset"}
              </span>

              <span>
                {flights.length} flights
              </span>
            </div>

            <div className="space-y-3">
              {flights.map((flight) => {
                const departure =
                  flight.movementType ===
                  "departure";

                const MovementIcon =
                  departure
                    ? ArrowUpFromLine
                    : ArrowDownToLine;

                return (
                  <article
                    key={flight.flightId}
                    className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[auto_1fr_auto_auto]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                      <MovementIcon
                        size={18}
                        className="text-cyan-300"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">
                          {flight.flightNumber}
                        </p>

                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[11px] capitalize",
                            statusClass(
                              flight.status,
                            ),
                          ].join(" ")}
                        >
                          {flight.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {flight.airline} ·{" "}
                        {flight.aircraftType}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock
                        size={15}
                        className="text-slate-500"
                      />

                      <div>
                        <p>
                          {flight.estimatedTime ??
                            flight.scheduledTime}
                        </p>

                        <p className="text-xs text-slate-600">
                          Gate {flight.gate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Users
                        size={15}
                        className="text-slate-500"
                      />

                      <div>
                        <p>
                          {flight.expectedPassengers.toLocaleString()}
                        </p>

                        <p className="text-xs text-slate-600">
                          passengers
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
EOF

echo "Adding flight panel to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path("src/components/dashboard/plant-dashboard.tsx")
content = path.read_text()

import_line = (
    'import { FlightSchedulePanel } '
    'from "@/components/flights/flight-schedule-panel";\n'
)

if import_line not in content:
    marker = (
        'import { KpiCard } '
        'from "@/components/dashboard/kpi-card";\n'
    )

    content = content.replace(
        marker,
        marker + import_line,
    )

panel = """
        <FlightSchedulePanel />

"""

if panel.strip() not in content:
    marker = (
        '        <section className="grid gap-6 '
        'xl:grid-cols-[minmax(0,1fr)_420px]">'
    )

    content = content.replace(
        marker,
        panel + marker,
    )

path.write_text(content)
PYTHON

echo "Creating Google Apps Script backend reference..."

cat > docs/google-apps-script/Code.gs <<'EOF'
const SPREADSHEET_ID =
  PropertiesService
    .getScriptProperties()
    .getProperty("SPREADSHEET_ID");

const API_KEY =
  PropertiesService
    .getScriptProperties()
    .getProperty("API_KEY");

const SHEETS = {
  flights: "Flight_Schedule",
  state: "System_State",
  commands: "Control_Commands",
  snapshots: "State_Snapshots",
};

function doPost(e) {
  try {
    const request = JSON.parse(
      e.postData.contents,
    );

    validateApiKey(request.apiKey);

    let data;

    switch (request.action) {
      case "getTodayFlights":
        data = getTodayFlights(
          request.payload,
        );
        break;

      case "savePlantSnapshot":
        data = savePlantSnapshot(
          request.payload,
        );
        break;

      case "saveCommandLog":
        data = saveCommandLog(
          request.payload,
        );
        break;

      default:
        throw new Error(
          "Unsupported action: " +
            request.action,
        );
    }

    return jsonResponse({
      success: true,
      requestId: request.requestId,
      timestamp:
        new Date().toISOString(),
      data,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      timestamp:
        new Date().toISOString(),
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}

function validateApiKey(apiKey) {
  if (!API_KEY) {
    return;
  }

  if (apiKey !== API_KEY) {
    throw new Error("Unauthorized request.");
  }
}

function spreadsheet() {
  if (!SPREADSHEET_ID) {
    throw new Error(
      "SPREADSHEET_ID is not configured.",
    );
  }

  return SpreadsheetApp.openById(
    SPREADSHEET_ID,
  );
}

function getOrCreateSheet(
  name,
  headers,
) {
  const file = spreadsheet();

  let sheet =
    file.getSheetByName(name);

  if (!sheet) {
    sheet = file.insertSheet(name);
  }

  if (
    sheet.getLastRow() === 0 &&
    headers.length > 0
  ) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getTodayFlights(payload) {
  const date =
    payload && payload.date
      ? payload.date
      : Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          "yyyy-MM-dd",
        );

  const sheet = getOrCreateSheet(
    SHEETS.flights,
    flightHeaders(),
  );

  if (sheet.getLastRow() < 2) {
    return [];
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      flightHeaders().length,
    )
    .getValues();

  return rows
    .map(rowToFlight)
    .filter(
      flight =>
        flight.date === date,
    );
}

function savePlantSnapshot(payload) {
  const headers = [
    "Snapshot ID",
    "Timestamp",
    "Source",
    "State JSON",
  ];

  const sheet = getOrCreateSheet(
    SHEETS.snapshots,
    headers,
  );

  sheet.appendRow([
    payload.snapshotId,
    payload.timestamp,
    payload.source,
    JSON.stringify(payload.state),
  ]);

  return {
    snapshotId:
      payload.snapshotId,
    saved: true,
  };
}

function saveCommandLog(payload) {
  const headers = [
    "Command ID",
    "Requested At",
    "Requested By",
    "Command Source",
    "Raw Command",
    "Action",
    "Equipment ID",
    "Parameter",
    "Old Value",
    "Requested Value",
    "Unit",
    "Reason",
    "Approval Required",
    "Approval Status",
    "Execution Status",
    "Result Message",
    "Executed At",
  ];

  const sheet = getOrCreateSheet(
    SHEETS.commands,
    headers,
  );

  sheet.appendRow([
    payload.commandId,
    payload.requestedAt,
    payload.requestedBy,
    payload.commandSource,
    payload.rawCommand,
    payload.action,
    payload.equipmentId,
    payload.parameter,
    payload.oldValue,
    payload.requestedValue,
    payload.unit,
    payload.reason,
    payload.approvalRequired,
    payload.approvalStatus,
    payload.executionStatus,
    payload.resultMessage,
    payload.executedAt,
  ]);

  return {
    commandId:
      payload.commandId,
    saved: true,
  };
}

function flightHeaders() {
  return [
    "Flight ID",
    "Date",
    "Flight Number",
    "Airline",
    "Movement Type",
    "Scheduled Time",
    "Estimated Time",
    "Actual Time",
    "Terminal",
    "Gate",
    "Aircraft Type",
    "Expected Passengers",
    "Actual Passengers",
    "Status",
    "Linked Zone IDs",
    "Remarks",
  ];
}

function rowToFlight(row) {
  return {
    flightId: String(row[0] || ""),
    date: formatSheetDate(row[1]),
    flightNumber:
      String(row[2] || ""),
    airline:
      String(row[3] || ""),
    movementType:
      String(row[4] || "")
        .toLowerCase(),
    scheduledTime:
      formatSheetTime(row[5]),
    estimatedTime:
      row[6]
        ? formatSheetTime(row[6])
        : null,
    actualTime:
      row[7]
        ? formatSheetTime(row[7])
        : null,
    terminal:
      String(row[8] || ""),
    gate:
      String(row[9] || ""),
    aircraftType:
      String(row[10] || ""),
    expectedPassengers:
      Number(row[11] || 0),
    actualPassengers:
      row[12] === "" ||
      row[12] == null
        ? null
        : Number(row[12]),
    status:
      String(row[13] || "scheduled")
        .toLowerCase(),
    linkedZoneIds:
      String(row[14] || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
    remarks:
      String(row[15] || ""),
  };
}

function formatSheetDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    );
  }

  return String(value || "");
}

function formatSheetTime(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "HH:mm",
    );
  }

  return String(value || "");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(
      JSON.stringify(payload),
    )
    .setMimeType(
      ContentService.MimeType.JSON,
    );
}
EOF

echo "Creating Google Sheet tab specification..."

cat > docs/google-apps-script/SHEET_STRUCTURE.md <<'EOF'
# Google Spreadsheet Tabs

## Flight_Schedule

- Flight ID
- Date
- Flight Number
- Airline
- Movement Type
- Scheduled Time
- Estimated Time
- Actual Time
- Terminal
- Gate
- Aircraft Type
- Expected Passengers
- Actual Passengers
- Status
- Linked Zone IDs
- Remarks

## System_State

Stores the latest effective virtual state.

## State_Snapshots

Stores periodic JSON snapshots of the plant.

## Control_Commands

Stores LUMI, dashboard, automatic, and system command history.

## Equipment_Master

Stores equipment identity, type, location, manufacturer, model, design rating,
priority, enablement, and operating status.

## Design_Data

Stores original HVAC design values for performance comparison.

## Alerts

Stores current and historical simulated alarms.

## Maintenance_Work_Orders

Stores inspection and maintenance workflows.

## Energy_Log

Stores interval power and energy calculations.

## AI_Recommendations

Stores LUMI analysis and recommendations.

## Audit_Log

Stores administrative and user activity.
EOF

echo "Formatting Part 6 files..."

npx prettier --write \
  src/types/persistence.ts \
  src/lib/validation/persistence.ts \
  src/data/demo/flight-schedule.ts \
  src/lib/google-sheets/client.ts \
  src/services/flight-repository.ts \
  src/services/persistence.service.ts \
  src/app/api/flights/route.ts \
  src/app/api/flights/today/route.ts \
  src/app/api/persistence/state/route.ts \
  src/app/api/persistence/command/route.ts \
  src/hooks/use-flight-schedule.ts \
  src/components/flights/flight-schedule-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  docs/google-apps-script/SHEET_STRUCTURE.md

echo "Running TypeScript validation..."

npm run typecheck

echo "Running ESLint..."

npm run lint

echo "Running production build..."

npm run build

echo "Staging Part 6 changes..."

git add \
  scripts/06-google-sheets-and-flight-data.sh \
  src/types/persistence.ts \
  src/lib/validation/persistence.ts \
  src/data/demo/flight-schedule.ts \
  src/lib/google-sheets/client.ts \
  src/services/flight-repository.ts \
  src/services/persistence.service.ts \
  src/app/api/flights/route.ts \
  src/app/api/flights/today/route.ts \
  src/app/api/persistence/state/route.ts \
  src/app/api/persistence/command/route.ts \
  src/hooks/use-flight-schedule.ts \
  src/components/flights/flight-schedule-panel.tsx \
  src/components/dashboard/plant-dashboard.tsx \
  docs/google-apps-script/Code.gs \
  docs/google-apps-script/SHEET_STRUCTURE.md

if git diff --cached --quiet; then
  echo "No new Part 6 changes to commit."
else
  git commit \
    -m "feat: add flight operations and Google Sheets persistence"

  git push
fi

echo
echo "============================================================"
echo "PART 6 COMPLETED SUCCESSFULLY"
echo "Google Sheets and flight data integration are ready"
echo "============================================================"
echo
echo "Available APIs:"
echo "  GET  /api/flights"
echo "  GET  /api/flights/today"
echo "  POST /api/persistence/state"
echo "  POST /api/persistence/command"
echo
echo "Without Apps Script configuration:"
echo "  The application automatically uses demo flight data."
echo
echo "With Apps Script configuration:"
echo "  Add GOOGLE_APPS_SCRIPT_URL and"
echo "  GOOGLE_APPS_SCRIPT_API_KEY to .env.local"
echo
