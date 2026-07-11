import type { Permission, UserRole } from "@/types/security";

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

export const rolePermissions: Record<UserRole, Permission[]> = {
  owner: allPermissions,

  administrator: allPermissions.filter(
    (permission) => permission !== "backup:restore",
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

export function permissionsForRole(role: UserRole): Permission[] {
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
  return rolePermissions[role].includes(permission);
}
