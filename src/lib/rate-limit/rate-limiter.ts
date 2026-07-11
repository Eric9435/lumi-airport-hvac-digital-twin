interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const globalRateLimitStore = globalThis as typeof globalThis & {
  __lumiRateLimits?: Map<string, RateLimitEntry>;
};

if (!globalRateLimitStore.__lumiRateLimits) {
  globalRateLimitStore.__lumiRateLimits = new Map();
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();

  const windowMilliseconds = windowSeconds * 1000;

  const store = globalRateLimitStore.__lumiRateLimits!;

  const current = store.get(key);

  if (!current || now - current.windowStartedAt >= windowMilliseconds) {
    store.set(key, {
      count: 1,
      windowStartedAt: now,
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: windowSeconds,
    };
  }

  if (current.count >= limit) {
    const elapsed = now - current.windowStartedAt;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowMilliseconds - elapsed) / 1000),
      ),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: windowSeconds,
  };
}
