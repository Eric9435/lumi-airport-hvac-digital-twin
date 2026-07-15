import { NextRequest, NextResponse } from "next/server";

import {
  findNexusReplayIndex,
  getNexusReplaySnapshot,
  loadNexusReplayBundle,
} from "@/lib/nexus/replay/nexus-replay-engine";

export const dynamic = "force-dynamic";

function parseRequestedIndex(
  request: NextRequest,
  snapshotCount: number,
  findIndexByTimestamp: (timestamp: string) => number,
): number {
  const timestamp = request.nextUrl.searchParams.get("timestamp");

  const indexValue = request.nextUrl.searchParams.get("index");

  if (timestamp) {
    return findIndexByTimestamp(timestamp);
  }

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

    const index = parseRequestedIndex(
      request,
      bundle.snapshotCount,
      (timestamp) => findNexusReplayIndex(bundle, timestamp),
    );

    const snapshot = getNexusReplaySnapshot(bundle, index);

    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-LUMI-Replay-Index": String(snapshot.index),
        "X-LUMI-Replay-Timestamp": snapshot.timestamp,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown replay engine error.";

    const status = error instanceof RangeError ? 400 : 500;

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
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
