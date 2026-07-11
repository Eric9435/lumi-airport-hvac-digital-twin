import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { runSimulationTick } from "@/lib/simulation/tick-engine";

import type { PlantState } from "@/types/hvac";

const tickRequestSchema = z.object({
  state: z.unknown(),
  intervalSeconds: z.number().positive().max(60).default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = tickRequestSchema.parse(await request.json());

    const result = runSimulationTick(
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
          error instanceof Error ? error.message : "Simulation tick failed.",
      },
      {
        status: 400,
      },
    );
  }
}
