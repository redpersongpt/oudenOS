// ─── Auth Routes ─────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users, userPreferences, refreshTokens, subscriptions } from "../db/index.js";
import {
  signAccessToken,
  requireAuth,
} from "../middleware/auth.js";
import { authRateLimit } from "../lib/rate-limit.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const rateLimit = authRateLimit(10, 60_000);

  // ── Register ──────────────────────────────────────────────────────────────
  app.post("/register", { preHandler: rateLimit }, async (request, reply) => {
    const parse = registerSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { email, password, displayName } = parse.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const inserted = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        displayName: displayName ?? null,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt });

    const user = inserted[0];
    if (!user) return reply.code(500).send({ error: "Registration failed" });

    // Seed default preferences and free subscription
    await Promise.all([
      db.insert(userPreferences).values({ userId: user.id }),
      db.insert(subscriptions).values({ userId: user.id, tier: "free", status: "active" }),
    ]);

    const accessToken = signAccessToken(user.id);
    const rawRefresh = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

    return reply.code(201).send({
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, email: user.email, displayName: user.displayName, tier: "free" },
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/login", { preHandler: rateLimit }, async (request, reply) => {
    const parse = loginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const { email, password } = parse.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    if (user.deletedAt) {
      return reply.code(401).send({ error: "Account deleted" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const [sub] = await db
      .select({ tier: subscriptions.tier, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(subscriptions.createdAt)
      .limit(1);

    const accessToken = signAccessToken(user.id);
    const rawRefresh = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

    return reply.send({
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        tier: sub?.tier ?? "free",
        subscriptionStatus: sub?.status ?? "active",
      },
    });
  });

  // ── Refresh token ─────────────────────────────────────────────────────────
  app.post("/refresh", { preHandler: rateLimit }, async (request, reply) => {
    const parse = refreshSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }
    const tokenHash = crypto
      .createHash("sha256")
      .update(parse.data.refreshToken)
      .digest("hex");

    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }

    // Rotate: revoke old, issue new
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, record.id));

    const rawRefresh = crypto.randomBytes(40).toString("hex");
    const newHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      userId: record.userId,
      tokenHash: newHash,
      expiresAt,
    });

    return reply.send({
      accessToken: signAccessToken(record.userId),
      refreshToken: rawRefresh,
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/logout", { preHandler: requireAuth }, async (request, reply) => {
    const parse = refreshSchema.safeParse(request.body);
    if (parse.success) {
      const tokenHash = crypto
        .createHash("sha256")
        .update(parse.data.refreshToken)
        .digest("hex");
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }
    return reply.send({ ok: true });
  });
};

