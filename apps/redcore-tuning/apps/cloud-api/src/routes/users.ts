// ─── User Management Routes ───────────────────────────────────────────────────

import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  db,
  users,
  subscriptions,
  userPreferences,
  connectedAccounts,
  machineActivations,
  paymentHistory,
} from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

const avatarSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/),
});

const preferencesSchema = z.object({
  telemetryEnabled: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  autoBackup: z.boolean().optional(),
  showRiskWarnings: z.boolean().optional(),
  expertMode: z.boolean().optional(),
  logLevel: z.enum(["error", "warn", "info", "debug"]).optional(),
});

const oauthLinkSchema = z.object({
  provider: z.enum(["google", "apple"]),
  providerUserId: z.string(),
  providerEmail: z.string().email().optional(),
  accessToken: z.string().optional(),
});

const machineActivationSchema = z.object({
  deviceFingerprint: z.string().min(8),
  hostname: z.string().optional(),
  osVersion: z.string().optional(),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /me ───────────────────────────────────────────────────────────────
  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });

    const [sub] = await db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        billingPeriod: subscriptions.billingPeriod,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    const connected = await db
      .select({ provider: connectedAccounts.provider, providerEmail: connectedAccounts.providerEmail, createdAt: connectedAccounts.createdAt })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));

    return reply.send({
      user,
      subscription: sub ?? { tier: "free", status: "active" },
      preferences: prefs ?? {},
      connectedAccounts: connected,
    });
  });

  // ── PATCH /me ─────────────────────────────────────────────────────────────
  app.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const parse = updateProfileSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const [updated] = await db
      .update(users)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(users.id, request.userId))
      .returning({ id: users.id, displayName: users.displayName });

    return reply.send({ user: updated });
  });

  // ── POST /me/email ────────────────────────────────────────────────────────
  app.post("/me/email", { preHandler: requireAuth }, async (request, reply) => {
    const parse = changeEmailSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { newEmail, password } = parse.data;

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.passwordHash) return reply.code(400).send({ error: "Cannot change email for OAuth accounts" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: "Current password is incorrect" });

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, newEmail.toLowerCase()))
      .limit(1);

    if (existing.length > 0) return reply.code(409).send({ error: "Email already in use" });

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await db
      .update(users)
      .set({
        email: newEmail.toLowerCase(),
        emailVerified: false,
        emailVerificationToken: verificationToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.userId));

    // In production: send verification email here
    app.log.info({ userId: request.userId, newEmail }, "Email change requested");

    return reply.send({ ok: true, message: "Email updated. Please verify your new email address." });
  });

  // ── POST /me/password ─────────────────────────────────────────────────────
  app.post("/me/password", { preHandler: requireAuth }, async (request, reply) => {
    const parse = changePasswordSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { currentPassword, newPassword } = parse.data;

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.passwordHash) return reply.code(400).send({ error: "No password set on this account" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({ ok: true });
  });

  // ── POST /me/avatar ───────────────────────────────────────────────────────
  // In production this would upload to S3/R2 and store the CDN URL.
  // Here we accept a base64 data URL and store it directly (demo only).
  app.post("/me/avatar", { preHandler: requireAuth }, async (request, reply) => {
    const parse = avatarSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid image data" });
    }

    // Validate size (< 2MB base64)
    if (parse.data.dataUrl.length > 2_800_000) {
      return reply.code(413).send({ error: "Image too large (max 2MB)" });
    }

    await db
      .update(users)
      .set({ avatarUrl: parse.data.dataUrl, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({ avatarUrl: parse.data.dataUrl });
  });

  // ── GET /me/machines ──────────────────────────────────────────────────────
  app.get("/me/machines", { preHandler: requireAuth }, async (request, reply) => {
    const machines = await db
      .select({
        id: machineActivations.id,
        deviceFingerprint: machineActivations.deviceFingerprint,
        hostname: machineActivations.hostname,
        osVersion: machineActivations.osVersion,
        activatedAt: machineActivations.activatedAt,
        lastSeenAt: machineActivations.lastSeenAt,
        status: machineActivations.status,
      })
      .from(machineActivations)
      .where(eq(machineActivations.userId, request.userId));

    return reply.send({ machines });
  });

  // ── POST /me/machines ─────────────────────────────────────────────────────
  app.post("/me/machines", { preHandler: requireAuth }, async (request, reply) => {
    const parse = machineActivationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    // Check existing active binding for this fingerprint
    const existing = await db
      .select({ id: machineActivations.id })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.deviceFingerprint, parse.data.deviceFingerprint),
          eq(machineActivations.status, "active"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update lastSeenAt
      await db
        .update(machineActivations)
        .set({ lastSeenAt: new Date() })
        .where(eq(machineActivations.id, existing[0]!.id));
      return reply.send({ ok: true, activated: false });
    }

    // Check 1-machine limit for free/premium; expert gets multi-machine
    const [sub] = await db
      .select({ tier: subscriptions.tier })
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const activeCount = await db
      .select({ id: machineActivations.id })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, "active"),
        ),
      );

    const maxMachines = sub?.tier === "expert" ? 3 : 1;
    if (activeCount.length >= maxMachines) {
      return reply.code(403).send({ error: `Machine limit reached (${maxMachines} for ${sub?.tier ?? "free"} tier)` });
    }

    const [activation] = await db
      .insert(machineActivations)
      .values({ userId: request.userId, ...parse.data })
      .returning();

    return reply.code(201).send({ ok: true, activated: true, machine: activation });
  });

  // ── DELETE /me/machines/:machineId ────────────────────────────────────────
  app.delete("/me/machines/:machineId", { preHandler: requireAuth }, async (request, reply) => {
    const { machineId } = request.params as { machineId: string };
    await db
      .update(machineActivations)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(
        and(
          eq(machineActivations.id, machineId),
          eq(machineActivations.userId, request.userId),
        ),
      );
    return reply.send({ ok: true });
  });

  // ── GET /me/connected-accounts ────────────────────────────────────────────
  app.get("/me/connected-accounts", { preHandler: requireAuth }, async (request, reply) => {
    const accounts = await db
      .select({
        id: connectedAccounts.id,
        provider: connectedAccounts.provider,
        providerEmail: connectedAccounts.providerEmail,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));

    return reply.send({ accounts });
  });

  // ── POST /me/connected-accounts ───────────────────────────────────────────
  app.post("/me/connected-accounts", { preHandler: requireAuth }, async (request, reply) => {
    const parse = oauthLinkSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { provider, providerUserId, providerEmail, accessToken } = parse.data;

    // Check not already linked
    const existing = await db
      .select({ id: connectedAccounts.id })
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, request.userId),
          eq(connectedAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({ error: `${provider} account already linked` });
    }

    const [account] = await db
      .insert(connectedAccounts)
      .values({ userId: request.userId, provider, providerUserId, providerEmail: providerEmail ?? null, accessToken: accessToken ?? null })
      .returning({ id: connectedAccounts.id, provider: connectedAccounts.provider, providerEmail: connectedAccounts.providerEmail });

    return reply.code(201).send({ account });
  });

  // ── DELETE /me/connected-accounts/:provider ───────────────────────────────
  app.delete("/me/connected-accounts/:provider", { preHandler: requireAuth }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    if (provider !== "google" && provider !== "apple") {
      return reply.code(400).send({ error: "Invalid provider" });
    }
    await db
      .delete(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, request.userId),
          eq(connectedAccounts.provider, provider),
        ),
      );
    return reply.send({ ok: true });
  });

  // ── PATCH /me/preferences ─────────────────────────────────────────────────
  app.patch("/me/preferences", { preHandler: requireAuth }, async (request, reply) => {
    const parse = preferencesSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ ...parse.data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, request.userId))
        .returning();
      return reply.send({ preferences: updated });
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values({ userId: request.userId, ...parse.data })
        .returning();
      return reply.send({ preferences: created });
    }
  });

  // ── GET /me/export ────────────────────────────────────────────────────────
  app.get("/me/export", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    const payments = await db
      .select({
        amountCents: paymentHistory.amountCents,
        currency: paymentHistory.currency,
        status: paymentHistory.status,
        createdAt: paymentHistory.createdAt,
      })
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, request.userId));

    const machines = await db
      .select({
        hostname: machineActivations.hostname,
        activatedAt: machineActivations.activatedAt,
        status: machineActivations.status,
      })
      .from(machineActivations)
      .where(eq(machineActivations.userId, request.userId));

    reply.header("Content-Disposition", 'attachment; filename="redcore-data-export.json"');
    return reply.send({
      exportedAt: new Date().toISOString(),
      user,
      preferences: prefs,
      paymentHistory: payments,
      machines,
    });
  });

  // ── DELETE /me ────────────────────────────────────────────────────────────
  app.delete("/me", { preHandler: requireAuth }, async (request, reply) => {
    const body = request.body as { password?: string; confirmation?: string } | null;
    if (body?.confirmation !== "DELETE MY ACCOUNT") {
      return reply.code(400).send({ error: 'Must confirm with "DELETE MY ACCOUNT"' });
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (user?.passwordHash && body?.password) {
      const valid = await bcrypt.compare(body.password, user.passwordHash);
      if (!valid) return reply.code(401).send({ error: "Password incorrect" });
    }

    // Soft delete
    await db
      .update(users)
      .set({ deletedAt: new Date(), email: `deleted+${request.userId}@redcore.invalid`, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({ ok: true });
  });
};
