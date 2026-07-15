import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export type FlightOperationalStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "arrived"
  | "delayed"
  | "cancelled"
  | "unknown";

export type FlightPressureLevel = "normal" | "elevated" | "high" | "critical";

export interface FlightOperationSummary {
  flightId: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledTime: string | null;
  estimatedTime: string | null;
  terminal: string | null;
  gate: string | null;
  status: FlightOperationalStatus;
  delayMinutes: number;
  estimatedPassengers: number;
  pressureLevel: FlightPressureLevel;
  dataSource: string;
}

export interface FlightOperationsTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  dataMode: "api-derived" | "fallback-model";
  totalFlights: number;
  arrivals: number;
  departures: number;
  delayedFlights: number;
  cancelledFlights: number;
  activeGates: number;
  estimatedPassengers: number;
  averageDelayMinutes: number;
  highPressureFlights: number;
  criticalPressureFlights: number;
  flights: FlightOperationSummary[];
  coupling: {
    passengerFlowDemandAvailable: boolean;
    hvacDemandCouplingAvailable: boolean;
    gateControlEnabled: false;
    autonomousDispatchEnabled: false;
    humanApprovalRequired: true;
  };
}

interface UnknownRecord {
  [key: string]: unknown;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeStatus(value: string | null): FlightOperationalStatus {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("cancel")) {
    return "cancelled";
  }

  if (normalized.includes("delay")) {
    return "delayed";
  }

  if (normalized.includes("board")) {
    return "boarding";
  }

  if (normalized.includes("depart") || normalized.includes("airborne")) {
    return "departed";
  }

  if (normalized.includes("arriv") || normalized.includes("landed")) {
    return "arrived";
  }

  if (normalized.includes("sched") || normalized.includes("on time")) {
    return "scheduled";
  }

  return "unknown";
}

function calculateDelayMinutes(record: UnknownRecord): number {
  const directDelay = readNumber(record, [
    "delayMinutes",
    "delay_minutes",
    "delay",
  ]);

  if (directDelay !== null) {
    return Math.max(0, directDelay);
  }

  const scheduled = readString(record, [
    "scheduledTime",
    "scheduled_time",
    "scheduled",
  ]);

  const estimated = readString(record, [
    "estimatedTime",
    "estimated_time",
    "estimated",
    "actualTime",
    "actual_time",
  ]);

  if (!scheduled || !estimated) {
    return 0;
  }

  const scheduledDate = new Date(scheduled);
  const estimatedDate = new Date(estimated);

  if (
    Number.isNaN(scheduledDate.getTime()) ||
    Number.isNaN(estimatedDate.getTime())
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((estimatedDate.getTime() - scheduledDate.getTime()) / 60_000),
  );
}

function determinePressureLevel(
  delayMinutes: number,
  estimatedPassengers: number,
  status: FlightOperationalStatus,
): FlightPressureLevel {
  if (status === "cancelled" || delayMinutes >= 180) {
    return "critical";
  }

  if (delayMinutes >= 90 || estimatedPassengers >= 350) {
    return "high";
  }

  if (delayMinutes >= 30 || estimatedPassengers >= 220) {
    return "elevated";
  }

  return "normal";
}

function extractFlightArray(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload
      .map(asRecord)
      .filter((record): record is UnknownRecord => record !== null);
  }

  const record = asRecord(payload);

  if (!record) {
    return [];
  }

  for (const key of ["flights", "data", "items", "results"]) {
    const candidate = record[key];

    if (Array.isArray(candidate)) {
      return candidate
        .map(asRecord)
        .filter((item): item is UnknownRecord => item !== null);
    }
  }

  return [];
}

function normalizeFlight(
  record: UnknownRecord,
  index: number,
): FlightOperationSummary {
  const flightNumber =
    readString(record, [
      "flightNumber",
      "flight_number",
      "flightNo",
      "number",
      "callsign",
    ]) ?? `FLIGHT-${index + 1}`;

  const status = normalizeStatus(
    readString(record, ["status", "flightStatus", "flight_status"]),
  );

  const delayMinutes = calculateDelayMinutes(record);

  const estimatedPassengers = Math.max(
    0,
    readNumber(record, [
      "estimatedPassengers",
      "passengerCount",
      "passengers",
      "capacity",
    ]) ?? 0,
  );

  return {
    flightId:
      readString(record, ["id", "flightId", "flight_id"]) ?? flightNumber,
    flightNumber,
    airline:
      readString(record, ["airline", "airlineName", "carrier"]) ??
      "Unknown airline",
    origin:
      readString(record, ["origin", "from", "departureAirport"]) ?? "Unknown",
    destination:
      readString(record, ["destination", "to", "arrivalAirport"]) ?? "Unknown",
    scheduledTime: readString(record, [
      "scheduledTime",
      "scheduled_time",
      "scheduled",
    ]),
    estimatedTime: readString(record, [
      "estimatedTime",
      "estimated_time",
      "estimated",
      "actualTime",
      "actual_time",
    ]),
    terminal: readString(record, ["terminal", "terminalId", "terminal_id"]),
    gate: readString(record, ["gate", "gateNumber", "gate_number"]),
    status,
    delayMinutes,
    estimatedPassengers,
    pressureLevel: determinePressureLevel(
      delayMinutes,
      estimatedPassengers,
      status,
    ),
    dataSource: "existing-flight-api",
  };
}

async function loadTodayFlightPayload(): Promise<unknown> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";

  try {
    const response = await fetch(new URL("/api/flights/today", baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

function createFallbackFlights(): FlightOperationSummary[] {
  return [];
}

function round(value: number, digits = 1): number {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

export async function createFlightOperationsTwinSnapshot(): Promise<FlightOperationsTwinSnapshot> {
  await initializeNexusAssets();

  const [payload, assets] = await Promise.all([
    loadTodayFlightPayload(),
    nexusAssetRegistry.list(),
  ]);

  const normalizedFlights = extractFlightArray(payload).map(normalizeFlight);

  const flights =
    normalizedFlights.length > 0 ? normalizedFlights : createFallbackFlights();

  const dataMode =
    normalizedFlights.length > 0 ? "api-derived" : "fallback-model";

  const activeGates = new Set(
    flights
      .map((flight) => flight.gate)
      .filter((gate): gate is string => gate !== null),
  ).size;

  const totalDelay = flights.reduce(
    (sum, flight) => sum + flight.delayMinutes,
    0,
  );

  const passengerFlowDemandAvailable = assets.some(
    (asset) =>
      asset.twinType === "passenger-flow" ||
      asset.metadata.currentOccupancy !== undefined ||
      asset.metadata.passengerCount !== undefined,
  );

  const hvacDemandCouplingAvailable = assets.some(
    (asset) =>
      asset.twinType === "hvac" &&
      (asset.zoneId !== undefined || asset.terminalId !== undefined),
  );

  return {
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    dataMode,
    totalFlights: flights.length,
    arrivals: flights.filter(
      (flight) => flight.status === "arrived" || flight.origin !== "Unknown",
    ).length,
    departures: flights.filter(
      (flight) =>
        flight.status === "departed" || flight.destination !== "Unknown",
    ).length,
    delayedFlights: flights.filter(
      (flight) => flight.status === "delayed" || flight.delayMinutes > 0,
    ).length,
    cancelledFlights: flights.filter((flight) => flight.status === "cancelled")
      .length,
    activeGates,
    estimatedPassengers: flights.reduce(
      (sum, flight) => sum + flight.estimatedPassengers,
      0,
    ),
    averageDelayMinutes:
      flights.length > 0 ? round(totalDelay / flights.length) : 0,
    highPressureFlights: flights.filter(
      (flight) => flight.pressureLevel === "high",
    ).length,
    criticalPressureFlights: flights.filter(
      (flight) => flight.pressureLevel === "critical",
    ).length,
    flights: flights.sort((left, right) => {
      const ranking: Record<FlightPressureLevel, number> = {
        critical: 4,
        high: 3,
        elevated: 2,
        normal: 1,
      };

      return ranking[right.pressureLevel] - ranking[left.pressureLevel];
    }),
    coupling: {
      passengerFlowDemandAvailable,
      hvacDemandCouplingAvailable,
      gateControlEnabled: false,
      autonomousDispatchEnabled: false,
      humanApprovalRequired: true,
    },
  };
}
