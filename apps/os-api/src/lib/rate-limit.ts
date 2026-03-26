import type {
  FastifyRequest,
  FastifyReply,
  preHandlerHookHandler,
} from 'fastify';

// ---------------------------------------------------------------------------
// In-memory sliding window rate limiter
// ---------------------------------------------------------------------------

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const AUTH_MAX = 15;
const AUTH_WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Cleanup stale entries every 5 minutes
// ---------------------------------------------------------------------------

function cleanup(): void {
  const now = Date.now();
  const cutoff = now - AUTH_WINDOW_MS;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

const cleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL_MS);
cleanupInterval.unref();

// ---------------------------------------------------------------------------
// Check function
// ---------------------------------------------------------------------------

function check(
  ip: string,
  maxRequests: number = AUTH_MAX,
  windowMs: number = AUTH_WINDOW_MS,
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0]!;
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: maxRequests - entry.timestamps.length,
  };
}

// ---------------------------------------------------------------------------
// Fastify middleware
// ---------------------------------------------------------------------------

export function authRateLimit(
  maxRequests: number = AUTH_MAX,
  windowMs: number = AUTH_WINDOW_MS,
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip;
    const result = check(ip, maxRequests, windowMs);

    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      reply.header('Retry-After', result.retryAfterSeconds);
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_001',
          message: 'Too many requests, please try again later',
          retryAfter: result.retryAfterSeconds,
        },
      });
    }
  };
}
