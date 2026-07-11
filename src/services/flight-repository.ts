import { demoFlightSchedule } from "@/data/demo/flight-schedule";

import { appsScriptClient } from "@/lib/google-sheets/client";

import { flightScheduleArraySchema } from "@/lib/validation/persistence";

import type { FlightScheduleRecord } from "@/types/persistence";

export interface FlightRepositoryResult {
  source: "google-sheets" | "demo";
  flights: FlightScheduleRecord[];
}

export async function getTodayFlights(): Promise<FlightRepositoryResult> {
  if (!appsScriptClient.configured) {
    return {
      source: "demo",
      flights: demoFlightSchedule,
    };
  }

  try {
    const result = await appsScriptClient.request<unknown, { date: string }>(
      "getTodayFlights",
      {
        date: new Date().toISOString().slice(0, 10),
      },
    );

    return {
      source: "google-sheets",
      flights: flightScheduleArraySchema.parse(result),
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
