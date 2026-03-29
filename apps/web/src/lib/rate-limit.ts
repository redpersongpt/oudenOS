type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

function sweepExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function applyFixedWindowRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  sweepExpiredBuckets();

  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function passwordResetRateLimit(headers: Headers, email: string) {
  const ip = getClientIp(headers);
  return applyFixedWindowRateLimit(`password-reset:${ip}:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
}
