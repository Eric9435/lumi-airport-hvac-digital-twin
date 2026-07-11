import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config/app-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: appConfig.name,
    version: appConfig.version,
    mode: appConfig.simulationMode
      ? "virtual-simulation"
      : "external-integration",
    timestamp: new Date().toISOString(),
  });
}
