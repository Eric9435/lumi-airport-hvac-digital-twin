import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { nexusSeveritySchema, nexusTwinTypeSchema } from "@/nexus/contracts";
import { nexusEventBus } from "@/nexus/events";

const querySchema = z.object({
  sourceTwin: nexusTwinTypeSchema.optional(),
  assetId: z.string().trim().min(1).max(128).optional(),
  eventType: z.string().trim().min(1).max(160).optional(),
  severity: nexusSeveritySchema.optional(),
  correlationId: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const events = nexusEventBus
      .getHistory(
        {
          sourceTwin: query.sourceTwin,
          assetId: query.assetId,
          eventType: query.eventType,
          severity: query.severity,
          correlationId: query.correlationId,
        },
        query.limit,
      )
      .reverse();

    return NextResponse.json(
      {
        count: events.length,
        events,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid Nexus event query.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read Nexus events.",
      },
      { status: 500 },
    );
  }
}
