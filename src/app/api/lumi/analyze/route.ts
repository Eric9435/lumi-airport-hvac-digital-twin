import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { analyzePlant } from "@/lib/diagnostics/diagnostic-engine";

import type { PlantState } from "@/types/hvac";

const requestSchema = z.object({
  state: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    const report = analyzePlant(body.state as PlantState);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error ? error.message : "Plant analysis failed.",
      },
      {
        status: 400,
      },
    );
  }
}
