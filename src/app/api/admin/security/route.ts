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

  return NextResponse.json({
    success: true,
    configuration: {
      sessionDurationHours: 8,
      minimumPasswordLength: 12,
      maximumLoginAttempts: 5,
      loginRateLimitPerMinute: 10,
      secureCookies: process.env.NODE_ENV === "production",
      sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
      initialAdminEmailConfigured: Boolean(process.env.INITIAL_ADMIN_EMAIL),
    },
  });
}
