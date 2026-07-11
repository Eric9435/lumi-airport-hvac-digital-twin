import { type NextRequest, NextResponse } from "next/server";

import { calculateExecutiveKpis } from "@/lib/intelligence/kpi-engine";

import type { PlantState } from "@/types/hvac";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      state: PlantState;
    };

    const summary = calculateExecutiveKpis(body.state);

    return NextResponse.json({
      success: true,

      generatedAt: summary.generatedAt,

      count: summary.predictiveMaintenance.length,

      predictions: summary.predictiveMaintenance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Predictive-maintenance analysis failed.",
      },
      {
        status: 400,
      },
    );
  }
}
