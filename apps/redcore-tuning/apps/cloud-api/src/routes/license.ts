import type { FastifyPluginAsync } from "fastify";

// ─── License Routes ─────────────────────────────────────────────────────────
// Product decision: redcore-Tuning v1 uses LOCAL-FIRST licensing.
//
// The desktop app validates licenses offline using AES-256-GCM encrypted
// cache with 30-day offline grace period (packages/license-client).
// These cloud endpoints are the FUTURE server-side validation layer.
//
// Current behavior:
// - /validate returns 503 (service unavailable) — client falls back to offline
// - /activate returns 503 — client uses local key validation
// - All other endpoints return 503 with clear messaging
//
// The license-client handles this gracefully:
// 1. Tries cloud validation
// 2. On 5xx, falls back to local encrypted cache
// 3. If cache is valid and within grace period, license works offline
// 4. If no cache exists, defaults to free tier
//
// This is NOT a 501 "not implemented" — the system works. Cloud validation
// is simply not the active path for v1.

const OFFLINE_FIRST_RESPONSE = {
  status: "offline_first",
  message: "redcore-Tuning v1 uses local-first licensing. Cloud validation will be available in a future release.",
  fallback: "The desktop client validates licenses locally with a 30-day offline grace period.",
};

export const licenseRoutes: FastifyPluginAsync = async (app) => {
  app.post("/validate", async (_request, reply) => {
    return reply.code(503).send(OFFLINE_FIRST_RESPONSE);
  });

  app.post("/activate", async (_request, reply) => {
    return reply.code(503).send(OFFLINE_FIRST_RESPONSE);
  });

  app.post("/deactivate", async (_request, reply) => {
    return reply.code(503).send(OFFLINE_FIRST_RESPONSE);
  });

  app.get("/subscription", async (_request, reply) => {
    return reply.code(503).send(OFFLINE_FIRST_RESPONSE);
  });

  app.post("/revoke-device", async (_request, reply) => {
    return reply.code(503).send(OFFLINE_FIRST_RESPONSE);
  });
};
