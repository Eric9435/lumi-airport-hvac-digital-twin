import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { validateLumiCommand } from "@/lib/validation/lumi-command";
import { parseLumiCommand } from "@/services/lumi-command.service";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    const command = parseLumiCommand(body.message);
    const validation = validateLumiCommand(command);

    return NextResponse.json(
      {
        success: validation.valid,
        command,
        validation,
        receivedAt: new Date().toISOString(),
      },
      {
        status: validation.valid ? 200 : 422,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Invalid command request.",
      },
      {
        status: 400,
      },
    );
  }
}
