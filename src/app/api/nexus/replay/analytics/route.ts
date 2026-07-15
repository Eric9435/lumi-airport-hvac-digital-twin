import { NextRequest, NextResponse } from "next/server";

import { analyzeNexusReplaySnapshot } from "@/lib/nexus/replay/nexus-replay-analytics";
import {
  findNexusReplayIndex,
  getNexusReplaySnapshot,
  loadNexusReplayBundle,
} from "@/lib/nexus/replay/nexus-replay-engine";

export const dynamic = "force-dynamic";

function resolveReplayIndex(
  request: NextRequest,
  snapshotCount: number,
  findIndexByTimestamp: (timestamp: string) => number,
): number {
  const timestamp = request.nextUrl.searchParams.get("timestamp");

  if (timestamp) {
    return findIndexByTimestamp(timestamp);
  }

  const indexValue = request.nextUrl.searchParams.get("index");

  if (indexValue === null) {
    return 0;
  }

  const index = Number(indexValue);

  if (!Number.isInteger(index) || index < 0 || index >= snapshotCount) {
    throw new RangeError(
      `Query parameter index must be an integer between 0 and ${snapshotCount - 1}.`,
    );
  }

  return index;
}

export function GET(request: NextRequest) {
  try {
    const bundle = loadNexusReplayBundle();

    const index = resolveReplayIndex(
      request,
      bundle.snapshotCount,
      (timestamp) => findNexusReplayIndex(bundle, timestamp),
    );

    const snapshot = getNexusReplaySnapshot(bundle, index);

    const analytics = analyzeNexusReplaySnapshot(snapshot);

    return NextResponse.json(analytics, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-LUMI-Replay-Index": String(analytics.index),
        "X-LUMI-Replay-Timestamp": analytics.timestamp,
        "X-LUMI-Alert-Count": String(analytics.totalAlerts),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Replay Analytics error.";

    return NextResponse.json(
      {
        status: "error",
        platform: "LUMI Nexus",
        runtimeMode: "dataset-replay",
        dataOrigin: "simulated",
        physicalControlEnabled: false,
        message,
      },
      {
        status: error instanceof RangeError ? 400 : 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
