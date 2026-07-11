import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/security/api-auth";

import { listSecurityUsers } from "@/services/security-user.service";

export async function GET() {
  const authorization = await requirePermission("users:read");

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
    users: await listSecurityUsers(),
  });
}
