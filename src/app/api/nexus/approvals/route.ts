import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  nexusApprovalRecordStatusSchema,
  nexusTwinTypeSchema,
} from "@/nexus/contracts";
import { nexusApprovalService } from "@/nexus/approvals";

const querySchema = z.object({
  status: nexusApprovalRecordStatusSchema.optional(),
  targetTwin: nexusTwinTypeSchema.optional(),
  requestedBy: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const approvals = await nexusApprovalService.list({
      status: query.status,
      targetTwin: query.targetTwin,
      requestedBy: query.requestedBy,
    });

    return NextResponse.json(
      {
        count: Math.min(approvals.length, query.limit),
        total: approvals.length,
        approvals: approvals.slice(0, query.limit),
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
          error: "Invalid Nexus approval query.",
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
            : "Unable to read Nexus approvals.",
      },
      { status: 500 },
    );
  }
}
