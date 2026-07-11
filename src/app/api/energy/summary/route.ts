import { type NextRequest, NextResponse } from "next/server";

import { calculateEnergySummary } from "@/lib/energy/energy-engine";

import type { EnergySample } from "@/types/analytics";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      samples: EnergySample[];
    };

    const summary = calculateEnergySummary(body.samples ?? []);

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
            : "Energy summary calculation failed.",
      },
      {
        status: 400,
      },
    );
  }
}
