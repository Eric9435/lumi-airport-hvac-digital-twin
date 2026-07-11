import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/security/api-auth";

export async function GET() {
  const authorization = await requirePermission("settings:read");

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: authorization.error,
      },
      {
        status: authorization.status,
      },
    );
  }

  const memory = process.memoryUsage();

  return NextResponse.json({
    success: true,
    metrics: {
      uptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
      },
      timestamp: new Date().toISOString(),
    },
  });
}
