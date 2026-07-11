import { describe, expect, it } from "vitest";

import { validatePasswordPolicy } from "@/lib/security/password-policy";

describe("password policy", () => {
  it("accepts a strong password", () => {
    const result = validatePasswordPolicy("StrongPassword!2026");

    expect(result.valid).toBe(true);

    expect(result.errors).toHaveLength(0);
  });

  it("rejects a weak password", () => {
    const result = validatePasswordPolicy("weak");

    expect(result.valid).toBe(false);

    expect(result.errors.length).toBeGreaterThan(0);
  });
});
