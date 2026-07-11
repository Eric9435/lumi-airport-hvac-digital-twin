import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/security/api-auth";

import { listSecurityAudit } from "@/services/security-audit.service";

export async function GET() {
  const authorization = await requirePermission("audit:read");

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

  return NextResponse.json({
    success: true,
    records: listSecurityAudit(),
  });
}
