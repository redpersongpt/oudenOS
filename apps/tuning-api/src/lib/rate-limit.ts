// In-process Rate Limiter
// Sliding-window rate limit keyed by IP. Good for single-instance dev/small
// deployments. Replace with Redis-backed store for multi-instance production.

import type { FastifyRequest, FastifyReply } from "fastify";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Purge expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count++;
  return true;
}

/**
 * Returns a Fastify preHandler that rate-limits by client IP.
 * @param max       Maximum requests per window (default 15)
 * @param windowMs  Window size in milliseconds (default 60 s)
 */
export function authRateLimit(max = 15, windowMs = 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `auth:${request.ip}`;
    if (!allow(key, max, windowMs)) {
      reply.header("Retry-After", String(Math.ceil(windowMs / 1000)));
      await reply.code(429).send({ error: "Too many requests. Please try again later." });
    }
  };
}
