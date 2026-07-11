import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";

describe("rate limiter", () => {
  it("allows requests inside the configured limit", () => {
    const key = `test-${Date.now()}`;

    const first = checkRateLimit(key, 2, 60);

    const second = checkRateLimit(key, 2, 60);

    expect(first.allowed).toBe(true);

    expect(second.allowed).toBe(true);
  });

  it("rejects requests exceeding the limit", () => {
    const key = `test-limit-${Date.now()}`;

    checkRateLimit(key, 1, 60);

    const blocked = checkRateLimit(key, 1, 60);

    expect(blocked.allowed).toBe(false);

    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
