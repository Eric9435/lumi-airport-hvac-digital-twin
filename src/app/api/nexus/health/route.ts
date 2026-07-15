import { NextResponse } from "next/server";

import { createNexusPlatformSnapshot } from "@/nexus/platform";

export async function GET(): Promise<NextResponse> {
  try {
    const snapshot = await createNexusPlatformSnapshot(10);

    return NextResponse.json(
      {
        status: snapshot.health.status,
        service: "lumi-nexus",
        generatedAt: snapshot.generatedAt,
        architecture: snapshot.platform.architecture,
        simulationOnly: snapshot.platform.simulationOnly,
        metrics: snapshot.health,
      },
      {
        status: snapshot.health.status === "operational" ? 200 : 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        service: "lumi-nexus",
        error:
          error instanceof Error ? error.message : "Unknown Nexus health error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
