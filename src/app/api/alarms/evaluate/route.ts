import { type NextRequest, NextResponse } from "next/server";

import { evaluatePlantAlarms } from "@/lib/alarms/alarm-engine";

import type { PlantState } from "@/types/hvac";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      state: PlantState;
    };

    const alarms = evaluatePlantAlarms(body.state);

    return NextResponse.json({
      success: true,
      count: alarms.length,
      alarms,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Alarm evaluation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
