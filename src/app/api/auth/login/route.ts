import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { recordSecurityAudit } from "@/lib/audit/security-audit";

import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";

import {
  createSessionToken,
  securitySessionCookieName,
  securitySessionMaxAge,
} from "@/lib/security/session";

import {
  findSecurityUserByEmail,
  recordFailedLogin,
  recordSuccessfulLogin,
  verifyUserPassword,
} from "@/services/security-user.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function requestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ipAddress = requestIp(request);

  const limit = checkRateLimit(`login:${ipAddress}`, 10, 60);

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many login attempts.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const body = loginSchema.parse(await request.json());

    const user = await findSecurityUserByEmail(body.email);

    if (!user || user.status !== "active") {
      recordSecurityAudit({
        action: "LOGIN_FAILED",
        resource: "security-session",
        result: "failed",
        ipAddress,
        userAgent: request.headers.get("user-agent"),
        details: {
          email: body.email,
          reason: "User unavailable or inactive.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials.",
        },
        {
          status: 401,
        },
      );
    }

    const validPassword = await verifyUserPassword(user, body.password);

    if (!validPassword) {
      await recordFailedLogin(user.userId);

      recordSecurityAudit({
        action: "LOGIN_FAILED",
        resource: "security-session",
        resourceId: user.userId,
        result: "failed",
        ipAddress,
        userAgent: request.headers.get("user-agent"),
        details: {
          email: user.email,
          reason: "Invalid password.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials.",
        },
        {
          status: 401,
        },
      );
    }

    await recordSuccessfulLogin(user.userId);

    const session = await createSessionToken({
      sessionId: randomUUID(),
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: user.permissions,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
        status: user.status,
        lastLoginAt: new Date().toISOString(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      expiresAt: session.expiresAt,
    });

    response.cookies.set({
      name: securitySessionCookieName(),
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: securitySessionMaxAge(),
    });

    recordSecurityAudit({
      session: {
        sessionId: randomUUID(),
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        permissions: user.permissions,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
      },
      action: "LOGIN_SUCCESS",
      resource: "security-session",
      resourceId: user.userId,
      result: "success",
      ipAddress,
      userAgent: request.headers.get("user-agent"),
      details: {},
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Login failed.",
      },
      {
        status: 400,
      },
    );
  }
}
