import { NextResponse } from "next/server";

import { getTodayFlights } from "@/services/flight-repository";

export async function GET() {
  const result = await getTodayFlights();

  const expectedPassengers = result.flights.reduce(
    (total, flight) => total + flight.expectedPassengers,
    0,
  );

  return NextResponse.json({
    success: true,
    source: result.source,
    date: new Date().toISOString().slice(0, 10),
    totalFlights: result.flights.length,
    expectedPassengers,
    flights: result.flights,
  });
}
