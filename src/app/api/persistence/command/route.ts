import { type NextRequest, NextResponse } from "next/server";

import { commandLogRequestSchema } from "@/lib/validation/persistence";

import { saveCommandLog } from "@/services/persistence.service";

export async function POST(request: NextRequest) {
  try {
    const body = commandLogRequestSchema.parse(await request.json());

    const result = await saveCommandLog({
      ...body,
      approvalRequired: false,
      approvalStatus: "not-required",
      executedAt:
        body.executionStatus === "executed" ? new Date().toISOString() : null,
    });

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
          error instanceof Error ? error.message : "Command logging failed.",
      },
      {
        status: 400,
      },
    );
  }
}
