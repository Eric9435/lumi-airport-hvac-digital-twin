import { NextResponse } from "next/server";

import { loadNexusDatasetCatalog } from "@/lib/nexus/datasets/nexus-dataset-catalog";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const catalog = loadNexusDatasetCatalog();

    return NextResponse.json(catalog, {
      status: catalog.status === "ready" ? 200 : 422,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dataset catalog error.";

    return NextResponse.json(
      {
        status: "error",
        platform: "LUMI Nexus",
        physicalControlEnabled: false,
        message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
