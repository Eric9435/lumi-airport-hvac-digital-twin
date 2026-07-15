import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { nexusTwinTypeSchema } from "@/nexus/contracts";
import { initializeNexusPlatform } from "@/nexus/platform";
import { nexusAssetRegistry } from "@/nexus/registry";

const querySchema = z.object({
  twinType: nexusTwinTypeSchema.optional(),
  assetType: z.string().trim().min(1).max(100).optional(),
  siteId: z.string().trim().min(1).max(128).optional(),
  terminalId: z.string().trim().min(1).max(128).optional(),
  zoneId: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    await initializeNexusPlatform();

    const assets = await nexusAssetRegistry.list({
      twinType: query.twinType,
      assetType: query.assetType,
      siteId: query.siteId,
      terminalId: query.terminalId,
      zoneId: query.zoneId,
    });

    return NextResponse.json(
      {
        count: Math.min(assets.length, query.limit),
        total: assets.length,
        assets: assets.slice(0, query.limit),
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
          error: "Invalid Nexus asset query.",
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
            : "Unable to read Nexus assets.",
      },
      { status: 500 },
    );
  }
}
