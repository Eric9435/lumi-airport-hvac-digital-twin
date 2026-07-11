#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/workspaces/lumi-airport-hvac-digital-twin"
SCRIPT_NAME="12a-enterprise-security-rbac-and-audit.sh"

handle_error() {
  local exit_code=$?
  local line_number="${1:-unknown}"

  echo
  echo "============================================================"
  echo "PART 12A FAILED"
  echo "Script: ${SCRIPT_NAME}"
  echo "Line: ${line_number}"
  echo "Exit code: ${exit_code}"
  echo "============================================================"

  exit "${exit_code}"
}

trap 'handle_error $LINENO' ERR

cd "${PROJECT_ROOT}"

required_files=(
  "package.json"
  "tsconfig.json"
  "src/types/hvac.ts"
  "src/app/api/health/route.ts"
  "src/components/dashboard/plant-dashboard.tsx"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "ERROR: Required file was not found: ${file}" >&2
    exit 1
  fi
done

echo "============================================================"
echo "PART 12A — ENTERPRISE SECURITY, RBAC AND AUDIT"
echo "============================================================"

echo "Installing security dependencies..."

npm install \
  jose \
  bcryptjs

npm install --save-dev \
  @types/bcryptjs

mkdir -p \
  src/types \
  src/lib/security \
  src/lib/audit \
  src/lib/rate-limit \
  src/services \
  src/app/api/auth/login \
  src/app/api/auth/logout \
  src/app/api/auth/session \
  src/app/api/admin/users \
  src/app/api/admin/users/role \
  src/app/api/admin/security \
  src/app/api/audit/security \
  src/app/api/system/metrics \
  src/components/admin \
  tests/unit/security \
  tests/integration/security \
  docs/security \
  data/security

echo "Creating security domain types..."

cat > src/types/security.ts <<'EOF'
export type UserRole =
  | "owner"
  | "administrator"
  | "engineer"
  | "operator"
  | "maintenance"
  | "auditor"
  | "viewer";

export type Permission =
  | "dashboard:read"
  | "plant:read"
  | "plant:control"
  | "simulation:execute"
  | "alarm:read"
  | "alarm:acknowledge"
  | "maintenance:read"
  | "maintenance:create"
  | "maintenance:update"
  | "reports:read"
  | "reports:export"
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:disable"
  | "audit:read"
  | "settings:read"
  | "settings:update"
  | "backup:create"
  | "backup:restore";

export type UserStatus =
  | "active"
  | "disabled"
  | "locked"
  | "pending";

export interface SecurityUser {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  passwordHash: string;
  failedLoginAttempts: number;
  lastLoginAt: string | null;
  lastPasswordChangeAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSecurityUser {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySession {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: Permission[];
  issuedAt: string;
  expiresAt: string;
}

export interface SecurityAuditRecord {
  auditId: string;
  timestamp: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  action: string;
  resource: string;
  resourceId: string | null;
  result:
    | "success"
    | "failed"
    | "rejected";
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: PublicSecurityUser;
  expiresAt?: string;
  error?: string;
}
EOF

echo "Creating RBAC permission model..."

cat > src/lib/security/permissions.ts <<'EOF'
import type {
  Permission,
  UserRole,
} from "@/types/security";

const allPermissions: Permission[] = [
  "dashboard:read",
  "plant:read",
  "plant:control",
  "simulation:execute",
  "alarm:read",
  "alarm:acknowledge",
  "maintenance:read",
  "maintenance:create",
  "maintenance:update",
  "reports:read",
  "reports:export",
  "users:read",
  "users:create",
  "users:update",
  "users:disable",
  "audit:read",
  "settings:read",
  "settings:update",
  "backup:create",
  "backup:restore",
];

export const rolePermissions:
  Record<UserRole, Permission[]> = {
  owner: allPermissions,

  administrator: allPermissions.filter(
    (permission) =>
      permission !== "backup:restore",
  ),

  engineer: [
    "dashboard:read",
    "plant:read",
    "plant:control",
    "simulation:execute",
    "alarm:read",
    "alarm:acknowledge",
    "maintenance:read",
    "maintenance:create",
    "maintenance:update",
    "reports:read",
    "reports:export",
    "settings:read",
  ],

  operator: [
    "dashboard:read",
    "plant:read",
    "plant:control",
    "alarm:read",
    "alarm:acknowledge",
    "maintenance:read",
    "maintenance:create",
    "reports:read",
  ],

  maintenance: [
    "dashboard:read",
    "plant:read",
    "alarm:read",
    "maintenance:read",
    "maintenance:create",
    "maintenance:update",
    "reports:read",
  ],

  auditor: [
    "dashboard:read",
    "plant:read",
    "alarm:read",
    "maintenance:read",
    "reports:read",
    "reports:export",
    "audit:read",
    "settings:read",
  ],

  viewer: [
    "dashboard:read",
    "plant:read",
    "alarm:read",
    "maintenance:read",
    "reports:read",
  ],
};

export function permissionsForRole(
  role: UserRole,
): Permission[] {
  return [...rolePermissions[role]];
}

export function hasPermission(
  permissions: Permission[],
  permission: Permission,
): boolean {
  return permissions.includes(permission);
}

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(
    permission,
  );
}
EOF

echo "Creating password policy..."

cat > src/lib/security/password-policy.ts <<'EOF'
export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(
  password: string,
): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push(
      "Password must contain at least 12 characters.",
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(
      "Password must contain an uppercase letter.",
    );
  }

  if (!/[a-z]/.test(password)) {
    errors.push(
      "Password must contain a lowercase letter.",
    );
  }

  if (!/[0-9]/.test(password)) {
    errors.push(
      "Password must contain a number.",
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push(
      "Password must contain a special character.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
EOF

echo "Creating secure session service..."

cat > src/lib/security/session.ts <<'EOF'
import {
  SignJWT,
  jwtVerify,
} from "jose";

import type {
  SecuritySession,
} from "@/types/security";

const SESSION_COOKIE_NAME =
  "lumi_security_session";

const SESSION_DURATION_SECONDS =
  60 * 60 * 8;

function sessionSecret(): Uint8Array {
  const value =
    process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "SESSION_SECRET must contain at least 32 characters in production.",
      );
    }

    return new TextEncoder().encode(
      "development-only-lumi-session-secret-change-this",
    );
  }

  return new TextEncoder().encode(
    value,
  );
}

export function securitySessionCookieName():
  string {
  return SESSION_COOKIE_NAME;
}

export function securitySessionMaxAge():
  number {
  return SESSION_DURATION_SECONDS;
}

export async function createSessionToken(
  session:
    Omit<
      SecuritySession,
      "issuedAt" | "expiresAt"
    >,
): Promise<{
  token: string;
  issuedAt: string;
  expiresAt: string;
}> {
  const issuedAtDate =
    new Date();

  const expiresAtDate =
    new Date(
      issuedAtDate.getTime() +
        SESSION_DURATION_SECONDS *
          1000,
    );

  const issuedAt =
    issuedAtDate.toISOString();

  const expiresAt =
    expiresAtDate.toISOString();

  const token =
    await new SignJWT({
      ...session,
      issuedAt,
      expiresAt,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setSubject(
        session.userId,
      )
      .setIssuedAt()
      .setExpirationTime(
        `${SESSION_DURATION_SECONDS}s`,
      )
      .sign(
        sessionSecret(),
      );

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
    const verification =
      await jwtVerify(
        token,
        sessionSecret(),
      );

    const payload =
      verification.payload;

    if (
      typeof payload.userId !==
        "string" ||
      typeof payload.email !==
        "string" ||
      typeof payload.displayName !==
        "string" ||
      typeof payload.role !==
        "string" ||
      !Array.isArray(
        payload.permissions,
      ) ||
      typeof payload.sessionId !==
        "string" ||
      typeof payload.issuedAt !==
        "string" ||
      typeof payload.expiresAt !==
        "string"
    ) {
      return null;
    }

    return {
      sessionId:
        payload.sessionId,
      userId:
        payload.userId,
      email:
        payload.email,
      displayName:
        payload.displayName,
      role:
        payload.role as SecuritySession["role"],
      permissions:
        payload.permissions as SecuritySession["permissions"],
      issuedAt:
        payload.issuedAt,
      expiresAt:
        payload.expiresAt,
    };
  } catch {
    return null;
  }
}
EOF

echo "Creating user repository..."

cat > src/services/security-user.service.ts <<'EOF'
import {
  compare,
  hash,
} from "bcryptjs";

import {
  permissionsForRole,
} from "@/lib/security/permissions";

import type {
  PublicSecurityUser,
  SecurityUser,
  UserRole,
} from "@/types/security";

const globalSecurityStore =
  globalThis as typeof globalThis & {
    __lumiSecurityUsers?:
      SecurityUser[];
  };

function sanitizeUser(
  user: SecurityUser,
): PublicSecurityUser {
  const {
    passwordHash: _passwordHash,
    failedLoginAttempts:
      _failedLoginAttempts,
    ...publicUser
  } = user;

  return publicUser;
}

async function initializeUsers():
  Promise<void> {
  if (
    globalSecurityStore
      .__lumiSecurityUsers
  ) {
    return;
  }

  const initialPassword =
    process.env
      .INITIAL_ADMIN_PASSWORD ??
    "ChangeMeNow!2026";

  const now =
    new Date().toISOString();

  globalSecurityStore
    .__lumiSecurityUsers = [
    {
      userId:
        "USR-OWNER-001",
      email:
        (
          process.env
            .INITIAL_ADMIN_EMAIL ??
          "owner@lumi.local"
        ).toLowerCase(),
      displayName:
        "LUMI Platform Owner",
      role: "owner",
      permissions:
        permissionsForRole(
          "owner",
        ),
      status: "active",
      passwordHash:
        await hash(
          initialPassword,
          12,
        ),
      failedLoginAttempts: 0,
      lastLoginAt: null,
      lastPasswordChangeAt:
        now,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function listSecurityUsers():
  Promise<PublicSecurityUser[]> {
  await initializeUsers();

  return (
    globalSecurityStore
      .__lumiSecurityUsers ?? []
  ).map(sanitizeUser);
}

export async function findSecurityUserByEmail(
  email: string,
): Promise<SecurityUser | null> {
  await initializeUsers();

  return (
    globalSecurityStore
      .__lumiSecurityUsers?.find(
        (user) =>
          user.email ===
          email
            .trim()
            .toLowerCase(),
      ) ?? null
  );
}

export async function verifyUserPassword(
  user: SecurityUser,
  password: string,
): Promise<boolean> {
  return compare(
    password,
    user.passwordHash,
  );
}

export async function recordSuccessfulLogin(
  userId: string,
): Promise<void> {
  await initializeUsers();

  const user =
    globalSecurityStore
      .__lumiSecurityUsers?.find(
        (item) =>
          item.userId === userId,
      );

  if (!user) {
    return;
  }

  user.failedLoginAttempts = 0;
  user.lastLoginAt =
    new Date().toISOString();
  user.updatedAt =
    new Date().toISOString();
}

export async function recordFailedLogin(
  userId: string,
): Promise<void> {
  await initializeUsers();

  const user =
    globalSecurityStore
      .__lumiSecurityUsers?.find(
        (item) =>
          item.userId === userId,
      );

  if (!user) {
    return;
  }

  user.failedLoginAttempts += 1;

  if (
    user.failedLoginAttempts >= 5
  ) {
    user.status = "locked";
  }

  user.updatedAt =
    new Date().toISOString();
}

export async function updateSecurityUserRole(
  userId: string,
  role: UserRole,
): Promise<PublicSecurityUser | null> {
  await initializeUsers();

  const user =
    globalSecurityStore
      .__lumiSecurityUsers?.find(
        (item) =>
          item.userId === userId,
      );

  if (!user) {
    return null;
  }

  user.role = role;
  user.permissions =
    permissionsForRole(role);
  user.updatedAt =
    new Date().toISOString();

  return sanitizeUser(user);
}
EOF

echo "Creating security audit repository..."

cat > src/services/security-audit.service.ts <<'EOF'
import type {
  SecurityAuditRecord,
} from "@/types/security";

const globalAuditStore =
  globalThis as typeof globalThis & {
    __lumiSecurityAudit?:
      SecurityAuditRecord[];
  };

if (
  !globalAuditStore
    .__lumiSecurityAudit
) {
  globalAuditStore
    .__lumiSecurityAudit = [];
}

export function appendSecurityAudit(
  record: SecurityAuditRecord,
): SecurityAuditRecord {
  globalAuditStore
    .__lumiSecurityAudit
    ?.unshift(record);

  globalAuditStore
    .__lumiSecurityAudit =
    globalAuditStore
      .__lumiSecurityAudit
      ?.slice(0, 1000);

  return record;
}

export function listSecurityAudit():
  SecurityAuditRecord[] {
  return [
    ...(
      globalAuditStore
        .__lumiSecurityAudit ?? []
    ),
  ];
}
EOF

echo "Creating audit helper..."

cat > src/lib/audit/security-audit.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  appendSecurityAudit,
} from "@/services/security-audit.service";

import type {
  SecurityAuditRecord,
  SecuritySession,
} from "@/types/security";

interface AuditInput {
  session?: SecuritySession | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  result:
    | "success"
    | "failed"
    | "rejected";
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

export function recordSecurityAudit(
  input: AuditInput,
): SecurityAuditRecord {
  return appendSecurityAudit({
    auditId: randomUUID(),
    timestamp:
      new Date().toISOString(),
    actorUserId:
      input.session?.userId ??
      null,
    actorEmail:
      input.session?.email ??
      null,
    actorRole:
      input.session?.role ??
      null,
    action:
      input.action,
    resource:
      input.resource,
    resourceId:
      input.resourceId ??
      null,
    result:
      input.result,
    ipAddress:
      input.ipAddress ??
      null,
    userAgent:
      input.userAgent ??
      null,
    details:
      input.details ?? {},
  });
}
EOF

echo "Creating API authorization helpers..."

cat > src/lib/security/api-auth.ts <<'EOF'
import {
  cookies,
} from "next/headers";

import {
  securitySessionCookieName,
  verifySessionToken,
} from "@/lib/security/session";

import {
  hasPermission,
} from "@/lib/security/permissions";

import type {
  Permission,
  SecuritySession,
} from "@/types/security";

export async function currentSecuritySession():
  Promise<SecuritySession | null> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      securitySessionCookieName(),
    )?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requirePermission(
  permission: Permission,
): Promise<
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
  const session =
    await currentSecuritySession();

  if (!session) {
    return {
      authorized: false,
      session: null,
      status: 401,
      error:
        "Authentication is required.",
    };
  }

  if (
    !hasPermission(
      session.permissions,
      permission,
    )
  ) {
    return {
      authorized: false,
      session: null,
      status: 403,
      error:
        "The current user does not have the required permission.",
    };
  }

  return {
    authorized: true,
    session,
  };
}
EOF

echo "Creating in-memory rate limiter..."

cat > src/lib/rate-limit/rate-limiter.ts <<'EOF'
interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const globalRateLimitStore =
  globalThis as typeof globalThis & {
    __lumiRateLimits?:
      Map<string, RateLimitEntry>;
  };

if (
  !globalRateLimitStore
    .__lumiRateLimits
) {
  globalRateLimitStore
    .__lumiRateLimits =
    new Map();
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();

  const windowMilliseconds =
    windowSeconds * 1000;

  const store =
    globalRateLimitStore
      .__lumiRateLimits!;

  const current =
    store.get(key);

  if (
    !current ||
    now -
      current.windowStartedAt >=
      windowMilliseconds
  ) {
    store.set(key, {
      count: 1,
      windowStartedAt: now,
    });

    return {
      allowed: true,
      remaining:
        Math.max(0, limit - 1),
      retryAfterSeconds:
        windowSeconds,
    };
  }

  if (current.count >= limit) {
    const elapsed =
      now -
      current.windowStartedAt;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            (
              windowMilliseconds -
              elapsed
            ) /
              1000,
          ),
        ),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining:
      Math.max(
        0,
        limit - current.count,
      ),
    retryAfterSeconds:
      windowSeconds,
  };
}
EOF

echo "Creating login API..."

cat > src/app/api/auth/login/route.ts <<'EOF'
import { randomUUID } from "node:crypto";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  recordSecurityAudit,
} from "@/lib/audit/security-audit";

import {
  checkRateLimit,
} from "@/lib/rate-limit/rate-limiter";

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

const loginSchema =
  z.object({
    email:
      z.string().email(),
    password:
      z.string().min(1),
  });

function requestIp(
  request: NextRequest,
): string {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ??
    request.headers.get(
      "x-real-ip",
    ) ??
    "unknown"
  );
}

export async function POST(
  request: NextRequest,
) {
  const ipAddress =
    requestIp(request);

  const limit =
    checkRateLimit(
      `login:${ipAddress}`,
      10,
      60,
    );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Too many login attempts.",
      },
      {
        status: 429,
        headers: {
          "Retry-After":
            String(
              limit.retryAfterSeconds,
            ),
        },
      },
    );
  }

  try {
    const body =
      loginSchema.parse(
        await request.json(),
      );

    const user =
      await findSecurityUserByEmail(
        body.email,
      );

    if (
      !user ||
      user.status !== "active"
    ) {
      recordSecurityAudit({
        action:
          "LOGIN_FAILED",
        resource:
          "security-session",
        result: "failed",
        ipAddress,
        userAgent:
          request.headers.get(
            "user-agent",
          ),
        details: {
          email: body.email,
          reason:
            "User unavailable or inactive.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid credentials.",
        },
        {
          status: 401,
        },
      );
    }

    const validPassword =
      await verifyUserPassword(
        user,
        body.password,
      );

    if (!validPassword) {
      await recordFailedLogin(
        user.userId,
      );

      recordSecurityAudit({
        action:
          "LOGIN_FAILED",
        resource:
          "security-session",
        resourceId:
          user.userId,
        result: "failed",
        ipAddress,
        userAgent:
          request.headers.get(
            "user-agent",
          ),
        details: {
          email: user.email,
          reason:
            "Invalid password.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid credentials.",
        },
        {
          status: 401,
        },
      );
    }

    await recordSuccessfulLogin(
      user.userId,
    );

    const session =
      await createSessionToken({
        sessionId:
          randomUUID(),
        userId:
          user.userId,
        email:
          user.email,
        displayName:
          user.displayName,
        role:
          user.role,
        permissions:
          user.permissions,
      });

    const response =
      NextResponse.json({
        success: true,
        user: {
          userId:
            user.userId,
          email:
            user.email,
          displayName:
            user.displayName,
          role:
            user.role,
          permissions:
            user.permissions,
          status:
            user.status,
          lastLoginAt:
            new Date().toISOString(),
          createdAt:
            user.createdAt,
          updatedAt:
            user.updatedAt,
        },
        expiresAt:
          session.expiresAt,
      });

    response.cookies.set({
      name:
        securitySessionCookieName(),
      value:
        session.token,
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "strict",
      path: "/",
      maxAge:
        securitySessionMaxAge(),
    });

    recordSecurityAudit({
      session: {
        sessionId:
          randomUUID(),
        userId:
          user.userId,
        email:
          user.email,
        displayName:
          user.displayName,
        role:
          user.role,
        permissions:
          user.permissions,
        issuedAt:
          session.issuedAt,
        expiresAt:
          session.expiresAt,
      },
      action:
        "LOGIN_SUCCESS",
      resource:
        "security-session",
      resourceId:
        user.userId,
      result: "success",
      ipAddress,
      userAgent:
        request.headers.get(
          "user-agent",
        ),
      details: {},
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Login failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating logout API..."

cat > src/app/api/auth/logout/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  recordSecurityAudit,
} from "@/lib/audit/security-audit";

import {
  currentSecuritySession,
} from "@/lib/security/api-auth";

import {
  securitySessionCookieName,
} from "@/lib/security/session";

export async function POST() {
  const session =
    await currentSecuritySession();

  const response =
    NextResponse.json({
      success: true,
    });

  response.cookies.set({
    name:
      securitySessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });

  recordSecurityAudit({
    session,
    action:
      "LOGOUT",
    resource:
      "security-session",
    resourceId:
      session?.sessionId ??
      null,
    result: "success",
    details: {},
  });

  return response;
}
EOF

echo "Creating session API..."

cat > src/app/api/auth/session/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  currentSecuritySession,
} from "@/lib/security/api-auth";

export async function GET() {
  const session =
    await currentSecuritySession();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        session: null,
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    authenticated: true,
    session,
  });
}
EOF

echo "Creating user administration API..."

cat > src/app/api/admin/users/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  requirePermission,
} from "@/lib/security/api-auth";

import {
  listSecurityUsers,
} from "@/services/security-user.service";

export async function GET() {
  const authorization =
    await requirePermission(
      "users:read",
    );

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      },
    );
  }

  return NextResponse.json({
    success: true,
    users:
      await listSecurityUsers(),
  });
}
EOF

echo "Creating role update API..."

cat > src/app/api/admin/users/role/route.ts <<'EOF'
import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  recordSecurityAudit,
} from "@/lib/audit/security-audit";

import {
  requirePermission,
} from "@/lib/security/api-auth";

import {
  updateSecurityUserRole,
} from "@/services/security-user.service";

const requestSchema =
  z.object({
    userId:
      z.string().min(1),
    role:
      z.enum([
        "owner",
        "administrator",
        "engineer",
        "operator",
        "maintenance",
        "auditor",
        "viewer",
      ]),
  });

export async function PATCH(
  request: NextRequest,
) {
  const authorization =
    await requirePermission(
      "users:update",
    );

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      },
    );
  }

  try {
    const body =
      requestSchema.parse(
        await request.json(),
      );

    const user =
      await updateSecurityUserRole(
        body.userId,
        body.role,
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User was not found.",
        },
        {
          status: 404,
        },
      );
    }

    recordSecurityAudit({
      session:
        authorization.session,
      action:
        "USER_ROLE_UPDATED",
      resource:
        "security-user",
      resourceId:
        user.userId,
      result: "success",
      details: {
        newRole:
          user.role,
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
        error:
          error instanceof Error
            ? error.message
            : "Role update failed.",
      },
      {
        status: 400,
      },
    );
  }
}
EOF

echo "Creating security audit API..."

cat > src/app/api/audit/security/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  requirePermission,
} from "@/lib/security/api-auth";

import {
  listSecurityAudit,
} from "@/services/security-audit.service";

export async function GET() {
  const authorization =
    await requirePermission(
      "audit:read",
    );

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      },
    );
  }

  return NextResponse.json({
    success: true,
    records:
      listSecurityAudit(),
  });
}
EOF

echo "Creating security configuration API..."

cat > src/app/api/admin/security/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  requirePermission,
} from "@/lib/security/api-auth";

export async function GET() {
  const authorization =
    await requirePermission(
      "settings:read",
    );

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
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
      secureCookies:
        process.env.NODE_ENV ===
        "production",
      sessionSecretConfigured:
        Boolean(
          process.env
            .SESSION_SECRET,
        ),
      initialAdminEmailConfigured:
        Boolean(
          process.env
            .INITIAL_ADMIN_EMAIL,
        ),
    },
  });
}
EOF

echo "Creating system metrics API..."

cat > src/app/api/system/metrics/route.ts <<'EOF'
import {
  NextResponse,
} from "next/server";

import {
  requirePermission,
} from "@/lib/security/api-auth";

export async function GET() {
  const authorization =
    await requirePermission(
      "settings:read",
    );

  if (!authorization.authorized) {
    return NextResponse.json(
      {
        success: false,
        error:
          authorization.error,
      },
      {
        status:
          authorization.status,
      },
    );
  }

  const memory =
    process.memoryUsage();

  return NextResponse.json({
    success: true,
    metrics: {
      uptimeSeconds:
        process.uptime(),
      nodeVersion:
        process.version,
      environment:
        process.env.NODE_ENV,
      memory: {
        rssBytes:
          memory.rss,
        heapTotalBytes:
          memory.heapTotal,
        heapUsedBytes:
          memory.heapUsed,
        externalBytes:
          memory.external,
      },
      timestamp:
        new Date().toISOString(),
    },
  });
}
EOF

echo "Creating security administration panel..."

cat > src/components/admin/security-admin-panel.tsx <<'EOF'
"use client";

import {
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  useState,
} from "react";

import type {
  PublicSecurityUser,
} from "@/types/security";

interface SecurityConfiguration {
  sessionDurationHours: number;
  minimumPasswordLength: number;
  maximumLoginAttempts: number;
  loginRateLimitPerMinute: number;
  secureCookies: boolean;
  sessionSecretConfigured: boolean;
  initialAdminEmailConfigured: boolean;
}

export function SecurityAdminPanel() {
  const [users, setUsers] =
    useState<
      PublicSecurityUser[]
    >([]);

  const [
    configuration,
    setConfiguration,
  ] =
    useState<SecurityConfiguration | null>(
      null,
    );

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  async function loadSecurityData() {
    setLoading(true);
    setMessage(null);

    try {
      const [
        usersResponse,
        configurationResponse,
      ] =
        await Promise.all([
          fetch(
            "/api/admin/users",
            {
              cache:
                "no-store",
            },
          ),
          fetch(
            "/api/admin/security",
            {
              cache:
                "no-store",
            },
          ),
        ]);

      if (
        usersResponse.status ===
          401 ||
        configurationResponse.status ===
          401
      ) {
        setMessage(
          "Administrator authentication is required.",
        );

        return;
      }

      const usersResult =
        (await usersResponse.json()) as {
          success: boolean;
          users?:
            PublicSecurityUser[];
          error?: string;
        };

      const configurationResult =
        (await configurationResponse.json()) as {
          success: boolean;
          configuration?:
            SecurityConfiguration;
          error?: string;
        };

      if (
        !usersResult.success ||
        !configurationResult.success
      ) {
        throw new Error(
          usersResult.error ??
            configurationResult.error ??
            "Security data could not be loaded.",
        );
      }

      setUsers(
        usersResult.users ?? [],
      );

      setConfiguration(
        configurationResult.configuration ??
          null,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Security data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
      <header className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={21}
              className="text-emerald-300"
            />

            <h2 className="text-lg font-semibold text-white">
              Enterprise Security Administration
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            RBAC, sessions, user access and security policy
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadSecurityData()
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Load security data
        </button>
      </header>

      <div className="space-y-6 p-5">
        {message ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {message}
          </div>
        ) : null}

        {configuration ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <LockKeyhole
                size={18}
                className="text-cyan-300"
              />

              <p className="mt-3 text-xs text-slate-500">
                Session duration
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {
                  configuration.sessionDurationHours
                }{" "}
                hours
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <KeyRound
                size={18}
                className="text-violet-300"
              />

              <p className="mt-3 text-xs text-slate-500">
                Minimum password
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {
                  configuration.minimumPasswordLength
                }{" "}
                characters
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <ShieldCheck
                size={18}
                className="text-emerald-300"
              />

              <p className="mt-3 text-xs text-slate-500">
                Session secret
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {configuration.sessionSecretConfigured
                  ? "Configured"
                  : "Development fallback"}
              </p>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <Users
                size={18}
                className="text-amber-300"
              />

              <p className="mt-3 text-xs text-slate-500">
                Registered users
              </p>

              <p className="mt-1 text-xl font-semibold text-white">
                {users.length}
              </p>
            </article>
          </section>
        ) : null}

        {users.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    User
                  </th>

                  <th className="px-4 py-3">
                    Role
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Permissions
                  </th>

                  <th className="px-4 py-3">
                    Last login
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {users.map(
                  (user) => (
                    <tr
                      key={
                        user.userId
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">
                          {
                            user.displayName
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            user.email
                          }
                        </p>
                      </td>

                      <td className="px-4 py-3 capitalize text-slate-300">
                        {
                          user.role
                        }
                      </td>

                      <td className="px-4 py-3 capitalize text-slate-300">
                        {
                          user.status
                        }
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {
                          user.permissions.length
                        }
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {user.lastLoginAt
                          ? new Date(
                              user.lastLoginAt,
                            ).toLocaleString()
                          : "Never"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
EOF

echo "Adding security panel to dashboard..."

python3 <<'PYTHON'
from pathlib import Path

path = Path(
    "src/components/dashboard/plant-dashboard.tsx"
)

content = path.read_text()

import_line = (
    'import { SecurityAdminPanel } '
    'from "@/components/admin/security-admin-panel";\n'
)

anchor = (
    'import { KpiCard } '
    'from "@/components/dashboard/kpi-card";\n'
)

if import_line not in content:
    content = content.replace(
        anchor,
        anchor + import_line,
        1,
    )

panel = '''
        <SecurityAdminPanel />

'''

markers = [
    "        <ExecutiveIntelligencePanel />",
    "        <ScenarioPanel />",
    "        <FlightSchedulePanel />",
]

if (
    "<SecurityAdminPanel />"
    not in content
):
    for marker in markers:
        if marker in content:
            content = content.replace(
                marker,
                panel + marker,
                1,
            )
            break

path.write_text(content)
PYTHON

echo "Updating environment template..."

cat >> .env.example <<'EOF'

# Enterprise security
SESSION_SECRET=
INITIAL_ADMIN_EMAIL=owner@lumi.local
INITIAL_ADMIN_PASSWORD=ChangeMeNow!2026
EOF

if ! grep -q '^SESSION_SECRET=' .env.local 2>/dev/null; then
  cat >> .env.local <<'EOF'

# Enterprise security
SESSION_SECRET=development-only-change-this-session-secret-123456
INITIAL_ADMIN_EMAIL=owner@lumi.local
INITIAL_ADMIN_PASSWORD=ChangeMeNow!2026
EOF
fi

echo "Creating RBAC unit tests..."

cat > tests/unit/security/permissions.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  permissionsForRole,
  roleHasPermission,
} from "@/lib/security/permissions";

describe(
  "RBAC permission model",
  () => {
    it(
      "grants owner all critical permissions",
      () => {
        expect(
          roleHasPermission(
            "owner",
            "users:update",
          ),
        ).toBe(true);

        expect(
          roleHasPermission(
            "owner",
            "backup:restore",
          ),
        ).toBe(true);
      },
    );

    it(
      "does not grant viewer control permission",
      () => {
        expect(
          roleHasPermission(
            "viewer",
            "plant:control",
          ),
        ).toBe(false);
      },
    );

    it(
      "returns independent permission arrays",
      () => {
        const first =
          permissionsForRole(
            "operator",
          );

        const second =
          permissionsForRole(
            "operator",
          );

        expect(first).toEqual(second);
        expect(first).not.toBe(second);
      },
    );
  },
);
EOF

echo "Creating password policy tests..."

cat > tests/unit/security/password-policy.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validatePasswordPolicy,
} from "@/lib/security/password-policy";

describe(
  "password policy",
  () => {
    it(
      "accepts a strong password",
      () => {
        const result =
          validatePasswordPolicy(
            "StrongPassword!2026",
          );

        expect(
          result.valid,
        ).toBe(true);

        expect(
          result.errors,
        ).toHaveLength(0);
      },
    );

    it(
      "rejects a weak password",
      () => {
        const result =
          validatePasswordPolicy(
            "weak",
          );

        expect(
          result.valid,
        ).toBe(false);

        expect(
          result.errors.length,
        ).toBeGreaterThan(0);
      },
    );
  },
);
EOF

echo "Creating rate-limit tests..."

cat > tests/unit/security/rate-limiter.test.ts <<'EOF'
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  checkRateLimit,
} from "@/lib/rate-limit/rate-limiter";

describe(
  "rate limiter",
  () => {
    it(
      "allows requests inside the configured limit",
      () => {
        const key =
          `test-${Date.now()}`;

        const first =
          checkRateLimit(
            key,
            2,
            60,
          );

        const second =
          checkRateLimit(
            key,
            2,
            60,
          );

        expect(
          first.allowed,
        ).toBe(true);

        expect(
          second.allowed,
        ).toBe(true);
      },
    );

    it(
      "rejects requests exceeding the limit",
      () => {
        const key =
          `test-limit-${Date.now()}`;

        checkRateLimit(
          key,
          1,
          60,
        );

        const blocked =
          checkRateLimit(
            key,
            1,
            60,
          );

        expect(
          blocked.allowed,
        ).toBe(false);

        expect(
          blocked.retryAfterSeconds,
        ).toBeGreaterThan(0);
      },
    );
  },
);
EOF

echo "Creating security architecture documentation..."

cat > docs/security/ENTERPRISE_SECURITY.md <<'EOF'
# Enterprise Security Architecture

## Scope

The security layer provides:

- Signed HTTP-only session cookies
- Role-based access control
- Permission-based API authorization
- Password hashing with bcrypt
- Login rate limiting
- Failed-login tracking
- Account lockout
- Security audit logging
- Protected administration APIs
- Runtime system metrics

## Default development account

The development environment uses:

```text
Email: owner@lumi.local
Password: ChangeMeNow!2026

The credentials must be replaced before deployment.

Required production environment variables
SESSION_SECRET
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD

SESSION_SECRET must contain at least 32 characters.

Roles
Owner
Administrator
Engineer
Operator
Maintenance
Auditor
Viewer
Important limitation

The current user and audit repositories are memory-based. They are appropriate
for virtual demonstration and development only.

Production deployment should replace them with PostgreSQL, another durable
database, or a validated Google Sheets persistence layer.
EOF

echo "Formatting Part 12A files..."

npx prettier --write
src/types/security.ts
src/lib/security/permissions.ts
src/lib/security/password-policy.ts
src/lib/security/session.ts
src/lib/security/api-auth.ts
src/lib/audit/security-audit.ts
src/lib/rate-limit/rate-limiter.ts
src/services/security-user.service.ts
src/services/security-audit.service.ts
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/session/route.ts
src/app/api/admin/users/route.ts
src/app/api/admin/users/role/route.ts
src/app/api/admin/security/route.ts
src/app/api/audit/security/route.ts
src/app/api/system/metrics/route.ts
src/components/admin/security-admin-panel.tsx
src/components/dashboard/plant-dashboard.tsx
tests/unit/security/permissions.test.ts
tests/unit/security/password-policy.test.ts
tests/unit/security/rate-limiter.test.ts
docs/security/ENTERPRISE_SECURITY.md

echo
echo "Running TypeScript validation..."

npm run typecheck

echo
echo "Running ESLint..."

npm run lint

echo
echo "Running automated tests..."

npm run test

echo
echo "Running production build..."

npm run build

echo
echo "Staging Part 12A changes..."

git add
package.json
package-lock.json
.env.example
scripts/12a-enterprise-security-rbac-and-audit.sh
src/types/security.ts
src/lib/security/permissions.ts
src/lib/security/password-policy.ts
src/lib/security/session.ts
src/lib/security/api-auth.ts
src/lib/audit/security-audit.ts
src/lib/rate-limit/rate-limiter.ts
src/services/security-user.service.ts
src/services/security-audit.service.ts
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/session/route.ts
src/app/api/admin/users/route.ts
src/app/api/admin/users/role/route.ts
src/app/api/admin/security/route.ts
src/app/api/audit/security/route.ts
src/app/api/system/metrics/route.ts
src/components/admin/security-admin-panel.tsx
src/components/dashboard/plant-dashboard.tsx
tests/unit/security/permissions.test.ts
tests/unit/security/password-policy.test.ts
tests/unit/security/rate-limiter.test.ts
docs/security/ENTERPRISE_SECURITY.md

echo
echo "Reviewing staged changes..."

git status --short

if git diff --cached --quiet; then
echo "No new Part 12A changes are available to commit."
else
git commit
-m "feat: add enterprise security RBAC sessions and audit logging"

git push
fi

echo
echo "============================================================"
echo "PART 12A COMPLETED SUCCESSFULLY"
echo "ENTERPRISE SECURITY FOUNDATION IS READY"
echo "============================================================"
echo
echo "Authentication APIs:"
echo " POST /api/auth/login"
echo " POST /api/auth/logout"
echo " GET /api/auth/session"
echo
echo "Administration APIs:"
echo " GET /api/admin/users"
echo " PATCH /api/admin/users/role"
echo " GET /api/admin/security"
echo " GET /api/audit/security"
echo " GET /api/system/metrics"
echo
echo "Development administrator:"
echo " Email: owner@lumi.local"
echo " Password: ChangeMeNow!2026"
echo
echo "IMPORTANT:"
echo " Change the default credentials and SESSION_SECRET before deployment."
echo
