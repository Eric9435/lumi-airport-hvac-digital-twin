import { type NextRequest, NextResponse } from "next/server";

import { analyzePlant } from "@/lib/diagnostics/diagnostic-engine";

import type { PlantState } from "@/types/hvac";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      state: PlantState;
    };

    const report = analyzePlant(body.state);

    return NextResponse.json({
      success: true,

      generatedAt: report.generatedAt,

      healthScore: report.overallHealthScore,

      recommendations: report.recommendations,
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
