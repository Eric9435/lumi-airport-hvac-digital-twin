import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { calculateExecutiveKpis } from "@/lib/intelligence/kpi-engine";

import type { PlantState } from "@/types/hvac";

const requestSchema = z.object({
  state: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    const summary = calculateExecutiveKpis(body.state as PlantState);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Executive intelligence calculation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
