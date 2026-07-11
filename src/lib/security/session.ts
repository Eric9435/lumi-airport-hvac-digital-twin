import { SignJWT, jwtVerify } from "jose";

import type { SecuritySession } from "@/types/security";

const SESSION_COOKIE_NAME = "lumi_security_session";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function sessionSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must contain at least 32 characters in production.",
      );
    }

    return new TextEncoder().encode(
      "development-only-lumi-session-secret-change-this",
    );
  }

  return new TextEncoder().encode(value);
}

export function securitySessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function securitySessionMaxAge(): number {
  return SESSION_DURATION_SECONDS;
}

export async function createSessionToken(
  session: Omit<SecuritySession, "issuedAt" | "expiresAt">,
): Promise<{
  token: string;
  issuedAt: string;
  expiresAt: string;
}> {
  const issuedAtDate = new Date();

  const expiresAtDate = new Date(
    issuedAtDate.getTime() + SESSION_DURATION_SECONDS * 1000,
  );

  const issuedAt = issuedAtDate.toISOString();

  const expiresAt = expiresAtDate.toISOString();

  const token = await new SignJWT({
    ...session,
    issuedAt,
    expiresAt,
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(sessionSecret());

  return {
    token,
    issuedAt,
    expiresAt,
  };
}

export async function verifySessionToken(
  token: string,
): Promise<SecuritySession | null> {
  try {
    const verification = await jwtVerify(token, sessionSecret());

    const payload = verification.payload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      typeof payload.role !== "string" ||
      !Array.isArray(payload.permissions) ||
      typeof payload.sessionId !== "string" ||
      typeof payload.issuedAt !== "string" ||
      typeof payload.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role as SecuritySession["role"],
      permissions: payload.permissions as SecuritySession["permissions"],
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}
