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

export type UserStatus = "active" | "disabled" | "locked" | "pending";

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
  result: "success" | "failed" | "rejected";
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
