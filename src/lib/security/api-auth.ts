import { cookies } from "next/headers";

import {
  securitySessionCookieName,
  verifySessionToken,
} from "@/lib/security/session";

import { hasPermission } from "@/lib/security/permissions";

import type { Permission, SecuritySession } from "@/types/security";

export async function currentSecuritySession(): Promise<SecuritySession | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(securitySessionCookieName())?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requirePermission(permission: Permission): Promise<
  | {
      authorized: true;
      session: SecuritySession;
    }
  | {
      authorized: false;
      session: null;
      status: 401 | 403;
      error: string;
    }
> {
  const session = await currentSecuritySession();

  if (!session) {
    return {
      authorized: false,
      session: null,
      status: 401,
      error: "Authentication is required.",
    };
  }

  if (!hasPermission(session.permissions, permission)) {
    return {
      authorized: false,
      session: null,
      status: 403,
      error: "The current user does not have the required permission.",
    };
  }

  return {
    authorized: true,
    session,
  };
}
