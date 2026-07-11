import { type NextRequest, NextResponse } from "next/server";

import { stateSyncRequestSchema } from "@/lib/validation/persistence";

import { savePlantSnapshot } from "@/services/persistence.service";

import type { PlantState } from "@/types/hvac";

export async function POST(request: NextRequest) {
  try {
    const body = stateSyncRequestSchema.parse(await request.json());

    const result = await savePlantSnapshot(
      body.state as PlantState,
      body.source,
    );

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "State persistence failed.",
      },
      {
        status: 400,
      },
    );
  }
}
