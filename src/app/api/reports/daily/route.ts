import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { generateDailyReport } from "@/lib/reports/daily-report";

import type { ActiveAlarm, EnergySample } from "@/types/analytics";

import type { PlantState } from "@/types/hvac";

const requestSchema = z.object({
  state: z.unknown(),
  energySamples: z.array(z.unknown()).default([]),
  alarms: z.array(z.unknown()).default([]),
  totalFlights: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    const report = generateDailyReport(
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
