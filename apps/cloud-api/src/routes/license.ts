// ─── License Routes ────────────────────────────────────────────────────────────
// POST /issue           — issue a signed license token for an active machine
// POST /validate        — validate a license token (online check + revocation)
// POST /refresh-token   — refresh an expiring license token
// GET  /public-key      — return the RSA public key for offline verification
// POST /revoke/:id      — revoke a machine license (self or admin)
//
// Architecture:
//   License tokens are signed JWTs (HS256 by default, RS256 if configured).
//   The desktop client caches the token on disk and verifies it on startup.
//   Online validation also checks the DB for subscription status + machine status.
//   Offline validation: client verifies JWT signature with the embedded public key.
//
//   Token claims:
//     sub         — userId
//     tier        — "free" | "premium" | "expert"
//     machineId   — machineActivations.id (UUID)
//     machineFingerprint — hardware fingerprint
//     issuedFor   — userId (redundant, explicit)
//     iat, exp    — issued at / expiry (30 days)

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  db,
  users,
  subscriptions,
  machineActivations,
} from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import {
  signLicenseToken,
  verifyLicenseToken,
  getLicensePublicKeyPem,
} from "../lib/jwt.js";
import { apiRateLimit } from "../lib/rate-limit.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const issueSchema = z.object({
  machineId: z.string().uuid(),
});

const validateSchema = z.object({
  token: z.string().min(1),
  machineFingerprint: z.string().min(8),
});

const revokeParamsSchema = z.object({
  machineId: z.string().uuid(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getActiveTier(userId: string): Promise<"free" | "premium" | "expert"> {
  const [sub] = await db
    .select({ tier: subscriptions.tier, status: subscriptions.status, overrideExpiresAt: subscriptions.overrideExpiresAt, manualOverride: subscriptions.manualOverride })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) return "free";

  // Expire stale manual overrides
  if (sub.manualOverride && sub.overrideExpiresAt && sub.overrideExpiresAt < new Date()) {
    await db
      .update(subscriptions)
      .set({ tier: "free", status: "cancelled", manualOverride: false, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
    return "free";
  }

  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  return sub.tier;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const licenseRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /issue ───────────────────────────────────────────────────────────
  // Issue a fresh license token for one of the user's active machines.
  app.post("/issue", { preHandler: [requireAuth, apiRateLimit()] }, async (request, reply) => {
    const parse = issueSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }

    const { machineId } = parse.data;

    // Verify the machine belongs to this user and is active
    const [machine] = await db
      .select({
        id: machineActivations.id,
        machineFingerprint: machineActivations.machineFingerprint,
        status: machineActivations.status,
        userId: machineActivations.userId,
      })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.id, machineId),
          eq(machineActivations.userId, request.userId),
        ),
      )
      .limit(1);

    if (!machine) {
      return reply.code(404).send({ error: "Machine not found" });
    }
    if (machine.status !== "active") {
      return reply.code(403).send({ error: "Machine is revoked or expired" });
    }

    const tier = await getActiveTier(request.userId);

    const token = await signLicenseToken({
      sub: request.userId,
      tier,
      machineId: machine.id,
      machineFingerprint: machine.machineFingerprint,
      issuedFor: request.userId,
    });

    // Update last seen
    await db
      .update(machineActivations)
      .set({ lastSeenAt: new Date() })
      .where(eq(machineActivations.id, machine.id));

    return reply.send({
      licenseToken: token,
      tier,
      machineId: machine.id,
      expiresInSeconds: 30 * 24 * 60 * 60,
    });
  });

  // ── POST /validate ────────────────────────────────────────────────────────
  // Online validation: verify JWT signature AND check DB state.
  app.post("/validate", { preHandler: apiRateLimit() }, async (request, reply) => {
    const parse = validateSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const { token, machineFingerprint } = parse.data;

    // 1. Cryptographic verification
    let claims: Awaited<ReturnType<typeof verifyLicenseToken>>;
    try {
      claims = await verifyLicenseToken(token);
    } catch {
      return reply.code(401).send({ valid: false, reason: "invalid_signature" });
    }

    // 2. Fingerprint must match token claims
    if (claims.machineFingerprint !== machineFingerprint) {
      return reply.code(403).send({ valid: false, reason: "fingerprint_mismatch" });
    }

    // 3. Machine must still be active in DB
    const [machine] = await db
      .select({ status: machineActivations.status, userId: machineActivations.userId })
      .from(machineActivations)
      .where(eq(machineActivations.id, claims.machineId))
      .limit(1);

    if (!machine) {
      return reply.send({ valid: false, reason: "machine_not_found" });
    }
    if (machine.status !== "active") {
      return reply.send({ valid: false, reason: "machine_revoked" });
    }

    // 4. User must exist and not be deleted
    const [user] = await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    if (!user || user.deletedAt) {
      return reply.send({ valid: false, reason: "account_not_found" });
    }

    // 5. Re-fetch current tier from DB (subscription may have changed since token was issued)
    const currentTier = await getActiveTier(claims.sub);

    // Update heartbeat
    await db
      .update(machineActivations)
      .set({ lastSeenAt: new Date() })
      .where(eq(machineActivations.id, claims.machineId));

    return reply.send({
      valid: true,
      tier: currentTier,
      machineId: claims.machineId,
      userId: claims.sub,
    });
  });

  // ── POST /refresh-token ───────────────────────────────────────────────────
  // Exchange an expiring (but still valid) license token for a fresh one.
  app.post("/refresh-token", { preHandler: [requireAuth, apiRateLimit()] }, async (request, reply) => {
    const parse = z.object({ token: z.string().min(1) }).safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    let claims: Awaited<ReturnType<typeof verifyLicenseToken>>;
    try {
      claims = await verifyLicenseToken(parse.data.token);
    } catch {
      return reply.code(401).send({ error: "Token is invalid or expired" });
    }

    if (claims.sub !== request.userId) {
      return reply.code(403).send({ error: "Token does not belong to this user" });
    }

    // Verify machine is still active
    const [machine] = await db
      .select({ status: machineActivations.status })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.id, claims.machineId),
          eq(machineActivations.userId, request.userId),
        ),
      )
      .limit(1);

    if (!machine || machine.status !== "active") {
      return reply.code(403).send({ error: "Machine is revoked or not found" });
    }

    const tier = await getActiveTier(request.userId);
    const newToken = await signLicenseToken({
      sub: request.userId,
      tier,
      machineId: claims.machineId,
      machineFingerprint: claims.machineFingerprint,
      issuedFor: request.userId,
    });

    await db
      .update(machineActivations)
      .set({ lastSeenAt: new Date() })
      .where(eq(machineActivations.id, claims.machineId));

    return reply.send({
      licenseToken: newToken,
      tier,
      expiresInSeconds: 30 * 24 * 60 * 60,
    });
  });

  // ── GET /public-key ───────────────────────────────────────────────────────
  // Returns the RSA public key PEM for embedding in the desktop client.
  // Returns null if running in HS256 mode (offline verification not available).
  app.get("/public-key", async (_request, reply) => {
    const pem = await getLicensePublicKeyPem();
    if (!pem) {
      return reply.send({
        algorithm: "HS256",
        publicKey: null,
        note: "Server is running in symmetric (HS256) mode. Offline license verification is not available.",
      });
    }
    return reply.send({ algorithm: "RS256", publicKey: pem });
  });

  // ── POST /revoke/:machineId ───────────────────────────────────────────────
  // User self-service revoke (same as DELETE /users/me/machines/:id).
  // Admin route to revoke any machine is under /admin/machines/:id.
  app.post<{ Params: { machineId: string } }>(
    "/revoke/:machineId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parse = revokeParamsSchema.safeParse(request.params);
      if (!parse.success) {
        return reply.code(400).send({ error: "Invalid machine ID" });
      }

      const result = await db
        .update(machineActivations)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(
          and(
            eq(machineActivations.id, parse.data.machineId),
            eq(machineActivations.userId, request.userId),
          ),
        )
        .returning({ id: machineActivations.id });

      if (result.length === 0) {
        return reply.code(404).send({ error: "Machine not found" });
      }

      return reply.send({ ok: true, revokedMachineId: parse.data.machineId });
    },
  );

  // ── Admin: POST /admin-revoke/:machineId ──────────────────────────────────
  app.post<{ Params: { machineId: string } }>(
    "/admin-revoke/:machineId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { machineId } = request.params;

      const result = await db
        .update(machineActivations)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(eq(machineActivations.id, machineId))
        .returning({ id: machineActivations.id, userId: machineActivations.userId });

      if (result.length === 0) {
        return reply.code(404).send({ error: "Machine not found" });
      }

      return reply.send({ ok: true, revokedMachineId: machineId });
    },
  );
};
