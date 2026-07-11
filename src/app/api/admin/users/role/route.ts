import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { recordSecurityAudit } from "@/lib/audit/security-audit";

import { requirePermission } from "@/lib/security/api-auth";

import { updateSecurityUserRole } from "@/services/security-user.service";

const requestSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([
    "owner",
    "administrator",
    "engineer",
    "operator",
    "maintenance",
    "auditor",
    "viewer",
  ]),
});

export async function PATCH(request: NextRequest) {
  const authorization = await requirePermission("users:update");

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

  try {
    const body = requestSchema.parse(await request.json());

    const user = await updateSecurityUserRole(body.userId, body.role);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User was not found.",
        },
        {
          status: 404,
        },
      );
    }

    recordSecurityAudit({
      session: authorization.session,
      action: "USER_ROLE_UPDATED",
      resource: "security-user",
      resourceId: user.userId,
      result: "success",
      details: {
        newRole: user.role,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Role update failed.",
      },
      {
        status: 400,
      },
    );
  }
}
