import { describe, expect, it } from "vitest";

import {
  permissionsForRole,
  roleHasPermission,
} from "@/lib/security/permissions";

describe("RBAC permission model", () => {
  it("grants owner all critical permissions", () => {
    expect(roleHasPermission("owner", "users:update")).toBe(true);

    expect(roleHasPermission("owner", "backup:restore")).toBe(true);
  });

  it("does not grant viewer control permission", () => {
    expect(roleHasPermission("viewer", "plant:control")).toBe(false);
  });

  it("returns independent permission arrays", () => {
    const first = permissionsForRole("operator");

    const second = permissionsForRole("operator");

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});
