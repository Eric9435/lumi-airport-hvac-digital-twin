import { compare, hash } from "bcryptjs";

import { permissionsForRole } from "@/lib/security/permissions";

import type {
  PublicSecurityUser,
  SecurityUser,
  UserRole,
} from "@/types/security";

const globalSecurityStore = globalThis as typeof globalThis & {
  __lumiSecurityUsers?: SecurityUser[];
};

function sanitizeUser(user: SecurityUser): PublicSecurityUser {
  const {
    passwordHash: _passwordHash,
    failedLoginAttempts: _failedLoginAttempts,
    ...publicUser
  } = user;

  return publicUser;
}

async function initializeUsers(): Promise<void> {
  if (globalSecurityStore.__lumiSecurityUsers) {
    return;
  }

  const initialPassword =
    process.env.INITIAL_ADMIN_PASSWORD ?? "ChangeMeNow!2026";

  const now = new Date().toISOString();

  globalSecurityStore.__lumiSecurityUsers = [
    {
      userId: "USR-OWNER-001",
      email: (
        process.env.INITIAL_ADMIN_EMAIL ?? "owner@lumi.local"
      ).toLowerCase(),
      displayName: "LUMI Platform Owner",
      role: "owner",
      permissions: permissionsForRole("owner"),
      status: "active",
      passwordHash: await hash(initialPassword, 12),
      failedLoginAttempts: 0,
      lastLoginAt: null,
      lastPasswordChangeAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function listSecurityUsers(): Promise<PublicSecurityUser[]> {
  await initializeUsers();

  return (globalSecurityStore.__lumiSecurityUsers ?? []).map(sanitizeUser);
}

export async function findSecurityUserByEmail(
  email: string,
): Promise<SecurityUser | null> {
  await initializeUsers();

  return (
    globalSecurityStore.__lumiSecurityUsers?.find(
      (user) => user.email === email.trim().toLowerCase(),
    ) ?? null
  );
}

export async function verifyUserPassword(
  user: SecurityUser,
  password: string,
): Promise<boolean> {
  return compare(password, user.passwordHash);
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await initializeUsers();

  const user = globalSecurityStore.__lumiSecurityUsers?.find(
    (item) => item.userId === userId,
  );

  if (!user) {
    return;
  }

  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
}

export async function recordFailedLogin(userId: string): Promise<void> {
  await initializeUsers();

  const user = globalSecurityStore.__lumiSecurityUsers?.find(
    (item) => item.userId === userId,
  );

  if (!user) {
    return;
  }

  user.failedLoginAttempts += 1;

  if (user.failedLoginAttempts >= 5) {
    user.status = "locked";
  }

  user.updatedAt = new Date().toISOString();
}

export async function updateSecurityUserRole(
  userId: string,
  role: UserRole,
): Promise<PublicSecurityUser | null> {
  await initializeUsers();

  const user = globalSecurityStore.__lumiSecurityUsers?.find(
    (item) => item.userId === userId,
  );

  if (!user) {
    return null;
  }

  user.role = role;
  user.permissions = permissionsForRole(role);
  user.updatedAt = new Date().toISOString();

  return sanitizeUser(user);
}
