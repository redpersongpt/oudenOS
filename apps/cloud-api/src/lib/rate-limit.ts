// In-process Rate Limiter
// Fixed-window rate limiting keyed by IP (or custom key).
//
// WARNING: This is a single-process store. If RATE_LIMIT_BACKEND is not set
// to "memory" in a multi-instance deployment, the process will warn on start
// — use @fastify/rate-limit + @fastify/redis for horizontal scaling.

import type { FastifyRequest, FastifyReply } from "fastify";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Refuse to start silently in multi-instance prod. Operator must opt-in.
if (
  process.env.NODE_ENV === "production" &&
  process.env.RATE_LIMIT_BACKEND !== "memory" &&
  !process.env.REDIS_URL
) {
  // Not fatal — we still rate-limit per-instance — but loud enough that
  // the operator sees it in boot logs.
  // eslint-disable-next-line no-console
  console.warn(
    "[rate-limit] Using in-process Map store in production. " +
      "Set RATE_LIMIT_BACKEND=memory to acknowledge, or configure REDIS_URL " +
      "for a shared store across instances.",
  );
}

// Sweep expired buckets every 5 minutes to prevent unbounded memory growth.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);
sweep.unref(); // Don't keep the process alive

function increment(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { allowed: true, retryAfterMs: 0 };
}

function clientKey(request: FastifyRequest): string {
  // SECURITY: Use request.ip which respects Fastify's trustProxy config.
  // Never parse X-Forwarded-For directly — attackers can forge the header
  // to get a fresh rate-limit bucket on every request, bypassing all limits.
  return request.ip;
}

/**
 * Rate limit preset for sensitive auth endpoints (login, register, forgot-password).
 * 10 requests / minute per IP.
 */
export function authRateLimit(max = 10, windowMs = 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `auth:${clientKey(request)}`;
    const { allowed, retryAfterMs } = increment(key, max, windowMs);
    if (!allowed) {
      reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      await reply.code(429).send({ error: "Too many requests. Please slow down." });
    }
  };
}

/**
 * Rate limit for token refresh — slightly more generous.
 * 30 requests / minute per IP.
 */
export function refreshRateLimit(max = 30, windowMs = 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `refresh:${clientKey(request)}`;
    const { allowed, retryAfterMs } = increment(key, max, windowMs);
    if (!allowed) {
      reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      await reply.code(429).send({ error: "Too many requests. Please slow down." });
    }
  };
}

/**
 * General API rate limit.
 * 120 requests / minute per IP.
 */
export function apiRateLimit(max = 120, windowMs = 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `api:${clientKey(request)}`;
    const { allowed, retryAfterMs } = increment(key, max, windowMs);
    if (!allowed) {
      reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      await reply.code(429).send({ error: "Too many requests." });
    }
  };
}

/**
 * Telemetry batch endpoint — limited to prevent abuse.
 * 20 batches / minute per IP.
 */
export function telemetryRateLimit(max = 20, windowMs = 60_000) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `telemetry:${clientKey(request)}`;
    const { allowed, retryAfterMs } = increment(key, max, windowMs);
    if (!allowed) {
      reply.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      await reply.code(429).send({ error: "Too many requests." });
    }
  };
}
