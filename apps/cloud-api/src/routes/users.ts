// ─── User Routes ──────────────────────────────────────────────────────────────
// GET    /me                            — full profile
// PATCH  /me                            — update name
// POST   /me/email                      — change email (requires password)
// POST   /me/password                   — change password
// POST   /me/avatar                     — upload avatar (base64)
// DELETE /me                            — soft-delete account
// PATCH  /me/preferences                — update preferences
// GET    /me/machines                   — list active machines
// POST   /me/machines                   — register / heartbeat machine
// DELETE /me/machines/:machineId        — revoke machine
// GET    /me/payment-history            — list payments
// GET    /me/export                     — GDPR data export
// GET    /me/connected-accounts         — list OAuth linked accounts
// POST   /me/connected-accounts         — link OAuth provider (post-login)
// DELETE /me/connected-accounts/:prov   — unlink OAuth provider

import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  users,
  subscriptions,
  userPreferences,
  connectedAccounts,
  machineActivations,
  paymentHistory,
  refreshTokens,
} from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail, emailChangedTemplate, verifyEmailTemplate } from "../lib/email.js";
import { authRateLimit } from "../lib/rate-limit.js";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateSecureToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email().max(255),
  password: z.string().max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().max(128),
  newPassword: z.string().min(8).max(128),
});

const avatarSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/),
});

const preferencesSchema = z.object({
  telemetryEnabled: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  autoBackup: z.boolean().optional(),
  showRiskWarnings: z.boolean().optional(),
  expertMode: z.boolean().optional(),
  logLevel: z.enum(["error", "warn", "info", "debug"]).optional(),
  extra: z.record(z.unknown()).optional(),
});

const registerMachineSchema = z.object({
  machineFingerprint: z.string().min(8).max(255),
  hostname: z.string().max(255).optional(),
  osVersion: z.string().max(100).optional(),
  appVersion: z.string().max(50).optional(),
});

const linkAccountSchema = z.object({
  provider: z.enum(["google", "apple"]),
  providerUserId: z.string().min(1),
  providerEmail: z.string().email().optional(),
});

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().max(128).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /me ──────────────────────────────────────────────────────────────
  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        oauthProvider: users.oauthProvider,
        role: users.role,
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
        manualOverride: subscriptions.manualOverride,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    const linked = await db
      .select({
        provider: connectedAccounts.provider,
        providerEmail: connectedAccounts.providerEmail,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));

    return reply.send({
      user,
      subscription: sub ?? { tier: "free", status: "active" },
      preferences: prefs ?? null,
      connectedAccounts: linked,
    });
  });

  // ── PATCH /me ─────────────────────────────────────────────────────────────
  app.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const parse = updateProfileSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    if (Object.keys(parse.data).length === 0) {
      return reply.code(400).send({ error: "Nothing to update" });
    }

    const [updated] = await db
      .update(users)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(users.id, request.userId))
      .returning({ id: users.id, name: users.name });

    return reply.send({ user: updated });
  });

  // ── POST /me/email ────────────────────────────────────────────────────────
  app.post("/me/email", { preHandler: [requireAuth, authRateLimit(5)] }, async (request, reply) => {
    const parse = changeEmailSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { newEmail, password } = parse.data;
    const normalizedNew = newEmail.toLowerCase().trim();

    const [user] = await db
      .select({ email: users.email, name: users.name, passwordHash: users.passwordHash, oauthProvider: users.oauthProvider })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });
    if (!user.passwordHash) {
      return reply.code(400).send({ error: "OAuth accounts cannot change email directly" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: "Current password is incorrect" });

    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedNew))
      .limit(1);

    if (conflict.length > 0) return reply.code(409).send({ error: "Email address is already in use" });

    const verificationToken = generateSecureToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        email: normalizedNew,
        emailVerified: false,
        emailVerificationToken: hashToken(verificationToken),
        emailVerificationExpiresAt: verificationExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.userId));

    const appUrl = process.env.APP_URL ?? "https://app.redcore-tuning.com";
    const verifyLink = `${appUrl}/verify-email?token=${verificationToken}`;

    sendEmail({
      to: normalizedNew,
      subject: "Verify your new redcore-Tuning email",
      html: verifyEmailTemplate(user.name ?? "", verifyLink),
    }).catch((err) => app.log.error({ err }, "Failed to send email change verification"));

    // Notify old email as security alert
    sendEmail({
      to: user.email,
      subject: "Your redcore-Tuning email was changed",
      html: emailChangedTemplate(user.name ?? "", user.email),
    }).catch((err) => app.log.error({ err }, "Failed to send email change notification"));

    return reply.send({ ok: true, message: "Email updated. Please verify your new email address." });
  });

  // ── POST /me/password ─────────────────────────────────────────────────────
  app.post("/me/password", { preHandler: [requireAuth, authRateLimit(5)] }, async (request, reply) => {
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

    if (!user?.passwordHash) {
      return reply.code(400).send({ error: "No password set on this account" });
    }

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
  // Accepts base64 data URL. In production, upload to S3/R2 and store CDN URL.
  app.post("/me/avatar", { preHandler: requireAuth }, async (request, reply) => {
    const parse = avatarSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid image data" });
    }

    // Guard against oversized payloads (~2 MB in base64 ≈ 2.8 MB string)
    if (parse.data.dataUrl.length > 2_800_000) {
      return reply.code(413).send({ error: "Image too large (max ~2 MB)" });
    }

    await db
      .update(users)
      .set({ avatarUrl: parse.data.dataUrl, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({ avatarUrl: parse.data.dataUrl });
  });

  // ── PATCH /me/preferences ─────────────────────────────────────────────────
  app.patch("/me/preferences", { preHandler: requireAuth }, async (request, reply) => {
    const parse = preferencesSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }

    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(userPreferences)
        .set({ ...parse.data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, request.userId))
        .returning();
    } else {
      [result] = await db
        .insert(userPreferences)
        .values({ userId: request.userId, ...parse.data })
        .returning();
    }

    return reply.send({ preferences: result });
  });

  // ── GET /me/machines ──────────────────────────────────────────────────────
  app.get("/me/machines", { preHandler: requireAuth }, async (request, reply) => {
    const machines = await db
      .select({
        id: machineActivations.id,
        machineFingerprint: machineActivations.machineFingerprint,
        hostname: machineActivations.hostname,
        osVersion: machineActivations.osVersion,
        appVersion: machineActivations.appVersion,
        status: machineActivations.status,
        activatedAt: machineActivations.activatedAt,
        lastSeenAt: machineActivations.lastSeenAt,
      })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, "active"),
        ),
      )
      .orderBy(desc(machineActivations.lastSeenAt));

    return reply.send({ machines });
  });

  // ── POST /me/machines ─────────────────────────────────────────────────────
  app.post("/me/machines", { preHandler: requireAuth }, async (request, reply) => {
    const parse = registerMachineSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { machineFingerprint, hostname, osVersion, appVersion } = parse.data;

    // Heartbeat: update existing active activation
    const [existing] = await db
      .select({ id: machineActivations.id })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.machineFingerprint, machineFingerprint),
          eq(machineActivations.status, "active"),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(machineActivations)
        .set({ lastSeenAt: new Date(), osVersion: osVersion ?? undefined, appVersion: appVersion ?? undefined })
        .where(eq(machineActivations.id, existing.id));
      return reply.send({ ok: true, activated: false, machineId: existing.id });
    }

    // Enforce machine limits based on subscription tier
    const [sub] = await db
      .select({ tier: subscriptions.tier })
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const activeMachines = await db
      .select({ id: machineActivations.id })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, "active"),
        ),
      );

    const maxMachines = sub?.tier === "expert" ? 3 : 1;
    if (activeMachines.length >= maxMachines) {
      return reply.code(403).send({
        error: `Machine limit reached (${maxMachines} for ${sub?.tier ?? "free"} plan). Revoke an existing machine to add a new one.`,
      });
    }

    const [activation] = await db
      .insert(machineActivations)
      .values({ userId: request.userId, machineFingerprint, hostname, osVersion, appVersion })
      .returning();

    return reply.code(201).send({ ok: true, activated: true, machineId: activation!.id, machine: activation });
  });

  // ── DELETE /me/machines/:machineId ────────────────────────────────────────
  app.delete<{ Params: { machineId: string } }>(
    "/me/machines/:machineId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { machineId } = request.params;

      const result = await db
        .update(machineActivations)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(
          and(
            eq(machineActivations.id, machineId),
            eq(machineActivations.userId, request.userId),
          ),
        )
        .returning({ id: machineActivations.id });

      if (result.length === 0) {
        return reply.code(404).send({ error: "Machine not found" });
      }

      return reply.send({ ok: true });
    },
  );

  // ── GET /me/payment-history ───────────────────────────────────────────────
  app.get("/me/payment-history", { preHandler: requireAuth }, async (request, reply) => {
    const payments = await db
      .select({
        id: paymentHistory.id,
        amount: paymentHistory.amount,
        currency: paymentHistory.currency,
        status: paymentHistory.status,
        description: paymentHistory.description,
        invoiceUrl: paymentHistory.invoiceUrl,
        createdAt: paymentHistory.createdAt,
      })
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, request.userId))
      .orderBy(desc(paymentHistory.createdAt))
      .limit(50);

    return reply.send({ payments });
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
    const parse = linkAccountSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { provider, providerUserId, providerEmail } = parse.data;

    // Check not already linked on this account
    const [existing] = await db
      .select({ id: connectedAccounts.id })
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, request.userId),
          eq(connectedAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (existing) {
      return reply.code(409).send({ error: `${provider} is already linked to this account` });
    }

    // Check this OAuth ID not linked to a different account
    const [takenElsewhere] = await db
      .select({ userId: connectedAccounts.userId })
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.provider, provider),
          eq(connectedAccounts.providerUserId, providerUserId),
        ),
      )
      .limit(1);

    if (takenElsewhere) {
      return reply.code(409).send({ error: `This ${provider} account is linked to a different user` });
    }

    const [account] = await db
      .insert(connectedAccounts)
      .values({ userId: request.userId, provider, providerUserId, providerEmail: providerEmail ?? null })
      .returning({ id: connectedAccounts.id, provider: connectedAccounts.provider, providerEmail: connectedAccounts.providerEmail });

    return reply.code(201).send({ account });
  });

  // ── DELETE /me/connected-accounts/:provider ───────────────────────────────
  app.delete<{ Params: { provider: string } }>(
    "/me/connected-accounts/:provider",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { provider } = request.params;
      if (provider !== "google" && provider !== "apple") {
        return reply.code(400).send({ error: "Invalid provider" });
      }

      // Don't allow unlinking the only sign-in method if no password is set
      const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (!user?.passwordHash) {
        const otherAccounts = await db
          .select({ id: connectedAccounts.id })
          .from(connectedAccounts)
          .where(
            and(
              eq(connectedAccounts.userId, request.userId),
              // not the one being deleted
            ),
          );
        if (otherAccounts.length <= 1) {
          return reply.code(400).send({
            error: "Cannot unlink the only sign-in method. Set a password first.",
          });
        }
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
    },
  );

  // ── GET /me/export ────────────────────────────────────────────────────────
  app.get("/me/export", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    const payments = await db
      .select({ amount: paymentHistory.amount, currency: paymentHistory.currency, status: paymentHistory.status, createdAt: paymentHistory.createdAt })
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, request.userId))
      .orderBy(desc(paymentHistory.createdAt));

    const machines = await db
      .select({ hostname: machineActivations.hostname, activatedAt: machineActivations.activatedAt, status: machineActivations.status })
      .from(machineActivations)
      .where(eq(machineActivations.userId, request.userId))
      .orderBy(desc(machineActivations.activatedAt));

    reply.header("Content-Disposition", 'attachment; filename="redcore-data-export.json"');
    return reply.send({
      exportedAt: new Date().toISOString(),
      user,
      preferences: prefs ?? null,
      paymentHistory: payments,
      machines,
    });
  });

  // ── DELETE /me ────────────────────────────────────────────────────────────
  app.delete("/me", { preHandler: [requireAuth, authRateLimit(3)] }, async (request, reply) => {
    const parse = deleteAccountSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Send { "confirmation": "DELETE MY ACCOUNT" } to confirm' });
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (user?.passwordHash && parse.data.password) {
      const valid = await bcrypt.compare(parse.data.password, user.passwordHash);
      if (!valid) return reply.code(401).send({ error: "Password is incorrect" });
    }

    // Soft-delete: scrub PII, preserve billing records for accounting
    await db
      .update(users)
      .set({
        email: `deleted+${request.userId}@redcore.invalid`,
        name: null,
        passwordHash: null,
        avatarUrl: null,
        emailVerificationToken: null,
        passwordResetToken: null,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.userId));

    // Revoke all refresh tokens immediately
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, request.userId));

    return reply.send({ ok: true });
  });
};
