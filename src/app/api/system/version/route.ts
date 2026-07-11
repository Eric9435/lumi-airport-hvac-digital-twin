import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config/app-config";

export async function GET() {
  return NextResponse.json({
    application: appConfig.name,

    version: appConfig.version,

    runtime: process.version,

    environment: process.env.NODE_ENV,

    commit: process.env.NEXT_PUBLIC_GIT_COMMIT ?? "development",

    timestamp: new Date().toISOString(),
  });
}
