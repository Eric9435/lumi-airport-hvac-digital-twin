import { NextResponse } from "next/server";

import { recordSecurityAudit } from "@/lib/audit/security-audit";

import { currentSecuritySession } from "@/lib/security/api-auth";

import { securitySessionCookieName } from "@/lib/security/session";

export async function POST() {
  const session = await currentSecuritySession();

  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: securitySessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });

  recordSecurityAudit({
    session,
    action: "LOGOUT",
    resource: "security-session",
    resourceId: session?.sessionId ?? null,
    result: "success",
    details: {},
  });

  return response;
}
